import Capacitor
import Foundation
import Security

@objc(FeriaAuthStoragePlugin)
public class FeriaAuthStoragePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FeriaAuthStoragePlugin"
    public let jsName = "FeriaAuthStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise)
    ]
    private let queue = DispatchQueue(label: "feria.auth.keychain")
    private let service = "com.feria.auth.v1"

    private func query(_ call: CAPPluginCall) -> [String: Any]? {
        guard let key = call.getString("key"), key.utf8.count <= 512,
              key.range(of: "\\Asb-[A-Za-z0-9_-]+-auth-token(?:-(?:code-verifier|user))?\\z",
                        options: .regularExpression) != nil else {
            call.reject("native_auth_key_invalid")
            return nil
        }
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrSynchronizable as String: false
        ]
    }

    @objc public func get(_ call: CAPPluginCall) {
        guard var query = query(call) else { return }
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        let readQuery = query
        queue.async {
            var result: CFTypeRef?
            let status = SecItemCopyMatching(readQuery as CFDictionary, &result)
            if status == errSecItemNotFound {
                call.resolve(["value": NSNull()])
            } else if status == errSecSuccess, let data = result as? Data,
                      data.count <= 262_144, let value = String(data: data, encoding: .utf8) {
                call.resolve(["value": value])
            } else {
                // Locked/unavailable/corrupt data must not be treated as an empty session.
                call.reject("native_auth_read_failed")
            }
        }
    }

    @objc public func set(_ call: CAPPluginCall) {
        guard let query = query(call) else { return }
        guard let value = call.getString("value"), let data = value.data(using: .utf8),
              data.count <= 262_144 else {
            call.reject("native_auth_value_invalid")
            return
        }
        queue.async {
            let attributes: [String: Any] = [
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            ]
            var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            if status == errSecItemNotFound {
                let entry = query.merging(attributes) { _, new in new }
                status = SecItemAdd(entry as CFDictionary, nil)
                if status == errSecDuplicateItem {
                    status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
                }
            }
            if status == errSecSuccess { call.resolve() }
            else { call.reject("native_auth_write_failed") }
        }
    }

    @objc public func remove(_ call: CAPPluginCall) {
        guard let query = query(call) else { return }
        queue.async {
            let status = SecItemDelete(query as CFDictionary)
            if status == errSecSuccess || status == errSecItemNotFound { call.resolve() }
            else { call.reject("native_auth_remove_failed") }
        }
    }
}
