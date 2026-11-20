import Capacitor
import Foundation
import StoreKit
import Security
import UIKit

// B05 source candidate. Not registered/installed in the shipping native project.
// StoreKit unfinished is durable across process death. No JS receipt persistence.
@objc(StallightPurchasesPlugin)
public class StallightPurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StallightPurchasesPlugin"
    public let jsName = "StallightPurchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "transactions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise)
    ]
    private var observer: Task<Void, Never>?
    private let purchaseLock = NSLock()
    private var purchaseInFlight = false
    private func reservePurchase() -> Bool {
        purchaseLock.lock(); defer { purchaseLock.unlock() }
        if purchaseInFlight { return false }; purchaseInFlight = true; return true
    }
    private func releasePurchase() { purchaseLock.lock(); purchaseInFlight = false; purchaseLock.unlock() }
    private func enabled(_ call: CAPPluginCall) -> Bool {
        guard getConfig().getBoolean("enabled", false) else { call.reject("apple_runtime_disabled"); return false }
        return true
    }
    public override func load() {
        guard getConfig().getBoolean("enabled", false) else { return }
        observer = Task { [weak self] in
            for await _ in Transaction.updates {
                // Signal only. JS must read the queue for the current authenticated owner.
                self?.notifyListeners("transactionsChanged", data: [:], retainUntilConsumed: true)
            }
        }
    }
    deinit { observer?.cancel() }
    private func token(_ call: CAPPluginCall) -> UUID? {
        guard let raw = call.getString("accountToken"), let uuid = UUID(uuidString: raw) else {
            call.reject("account_binding_invalid"); return nil
        }
        return uuid
    }
    private func row(_ verified: VerificationResult<Transaction>, token: UUID) throws -> [String: Any]? {
        guard case .verified(let tx) = verified else { throw PurchaseError.unverified }
        guard tx.productType == .autoRenewable else { return nil }
        guard tx.appAccountToken == token else { throw PurchaseError.accountMismatch }
        // App requires iOS 16+ (Capacitor 8). Local Xcode is not Sandbox.
        let environment: String
        switch tx.environment {
        case .sandbox: environment = "sandbox"
        case .production: environment = "production"
        default: throw PurchaseError.unverified
        }
        return ["transactionId": String(tx.id), "productId": tx.productID,
                "accountToken": token.uuidString.lowercased(), "environment": environment,
                "jws": verified.jwsRepresentation]
    }
    private enum PurchaseError: Error { case unverified, accountMismatch, productMissing, storageUnavailable }
    // Device-only Keychain stores uncertainty flags, never receipts or entitlements.
    private func pendingQuery(_ token: UUID) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "stallight.purchase.pending.v1",
         kSecAttrAccount as String: token.uuidString.lowercased(), kSecAttrSynchronizable as String: false]
    }
    private func setPending(_ value: Bool, token: UUID) throws {
        let query = pendingQuery(token)
        if !value {
            let status = SecItemDelete(query as CFDictionary)
            guard status == errSecSuccess || status == errSecItemNotFound else { throw PurchaseError.storageUnavailable }; return
        }
        var entry = query; entry[kSecValueData as String] = Data([1])
        entry[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(entry as CFDictionary, nil)
        guard status == errSecSuccess || status == errSecDuplicateItem else { throw PurchaseError.storageUnavailable }
    }
    private func isPending(_ token: UUID) throws -> Bool {
        let status = SecItemCopyMatching(pendingQuery(token) as CFDictionary, nil)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw PurchaseError.storageUnavailable }
        return status == errSecSuccess
    }
    @objc public func products(_ call: CAPPluginCall) {
        guard enabled(call) else { return }
        guard let ids = call.getArray("productIds", String.self), ids.count == 4, Set(ids).count == 4,
              ids.allSatisfy({ !$0.isEmpty && $0.utf8.count <= 256 }) else { call.reject("products_invalid"); return }
        Task {
            do {
                let values = try await Product.products(for: ids)
                let mapped: [[String: Any]] = values.compactMap { product in
                    guard product.type == .autoRenewable, let sub = product.subscription,
                          sub.introductoryOffer == nil else { return nil }
                    let period = sub.subscriptionPeriod
                    let unit: String
                    switch period.unit { case .month: unit = "M"; case .year: unit = "Y"; default: return nil }
                    guard period.value == 1 else { return nil }
                    return ["store": "apple_app_store", "productId": product.id, "displayName": product.displayName,
                            "purchaseOptions": [["purchaseOptionId": product.id, "basePlanId": NSNull(), "offerId": NSNull(),
                            "pricePhases": [["displayPrice": product.displayPrice, "currencyCode": product.priceFormatStyle.currencyCode,
                            "billingPeriod": "P1\(unit)", "billingCycleCount": NSNull(), "paymentMode": "recurring"]]]]]
                }
                call.resolve(["products": mapped])
            } catch { call.reject("store_unavailable") }
        }
    }
    @objc public func purchase(_ call: CAPPluginCall) {
        guard enabled(call) else { return }
        guard let token = token(call) else { return }
        guard let id = call.getString("productId"), !id.isEmpty, id.utf8.count <= 256 else { call.reject("product_invalid"); return }
        guard reservePurchase() else { call.reject("purchase_in_progress"); return }
        Task {
            defer { releasePurchase() }
            do {
                guard try !isPending(token) else { call.resolve(["status": "pending"]); return }
                guard AppStore.canMakePayments, let product = try await Product.products(for: [id]).first,
                      product.type == .autoRenewable, product.subscription?.introductoryOffer == nil else { throw PurchaseError.productMissing }
                try setPending(true, token: token)
                switch try await product.purchase(options: [.appAccountToken(token)]) {
                case .success(let result):
                    guard let data = try row(result, token: token) else { throw PurchaseError.unverified }
                    try setPending(false, token: token)
                    call.resolve(["status": "success", "transaction": data])
                case .pending: call.resolve(["status": "pending"])
                case .userCancelled:
                    try setPending(false, token: token)
                    call.resolve(["status": "cancelled"])
                @unknown default: call.reject("store_unavailable")
                }
                // Never finish here: server commit must precede delivery acknowledgement.
            } catch { call.reject("store_unavailable") }
        }
    }
    @objc public func transactions(_ call: CAPPluginCall) {
        guard enabled(call) else { return }
        guard let token = token(call) else { return }
        let sync = call.getBool("sync") ?? false
        Task {
            do {
                if sync { try await AppStore.sync() }
                var rows: [[String: Any]] = []; var seen = Set<String>(); var mismatch = false
                func collect(_ result: VerificationResult<Transaction>) throws {
                    do {
                        if let value = try row(result, token: token), let id = value["transactionId"] as? String,
                           seen.insert(id).inserted { rows.append(value) }
                    } catch PurchaseError.accountMismatch { mismatch = true }
                }
                for await result in Transaction.unfinished { try collect(result) }
                if sync { for await result in Transaction.currentEntitlements { try collect(result) } }
                guard rows.count <= 100 else { throw PurchaseError.unverified }
                if !rows.isEmpty { try setPending(false, token: token) }
                call.resolve(["transactions": rows, "accountMismatch": mismatch,
                              "pending": try isPending(token)])
            } catch { call.reject("store_unavailable") }
        }
    }
    @objc public func finish(_ call: CAPPluginCall) {
        guard enabled(call) else { return }
        guard let token = token(call) else { return }
        guard let id = call.getString("transactionId"), UInt64(id) != nil else { call.reject("transaction_invalid"); return }
        Task {
            // Re-read and bind before finishing. Already-finished acknowledgements are idempotent.
            for await result in Transaction.unfinished {
                guard case .verified(let tx) = result, String(tx.id) == id else { continue }
                guard tx.appAccountToken == token else { call.reject("account_binding_invalid"); return }
                await tx.finish(); call.resolve(); return
            }
            call.resolve()
        }
    }
    @objc public func manage(_ call: CAPPluginCall) {
        guard enabled(call) else { return }
        Task { @MainActor in
            do {
                guard let scene = self.bridge?.viewController?.view.window?.windowScene,
                      scene.activationState == .foregroundActive else { call.reject("scene_unavailable"); return }
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch { call.reject("store_unavailable") }
        }
    }
}
