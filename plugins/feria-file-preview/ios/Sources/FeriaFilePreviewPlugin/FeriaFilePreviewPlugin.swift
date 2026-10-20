import Capacitor
import Foundation
import QuickLook

@objc(FeriaFilePreviewPlugin)
public class FeriaFilePreviewPlugin: CAPPlugin, CAPBridgedPlugin, QLPreviewControllerDataSource, QLPreviewControllerDelegate {
    public let identifier = "FeriaFilePreviewPlugin"
    public let jsName = "FeriaFilePreview"
    public let pluginMethods = [CAPPluginMethod(name: "preview", returnType: CAPPluginReturnPromise)]
    private var pendingCall: CAPPluginCall?
    private var previewURL: URL?
    private var controller: QLPreviewController?

    @objc public func preview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pendingCall == nil,
                  let presenter = self.bridge?.viewController,
                  presenter.viewIfLoaded?.window != nil,
                  presenter.presentedViewController == nil else {
                call.reject("native_file_preview_unavailable")
                return
            }
            guard let raw = call.getString("uri"), let url = URL(string: raw),
                  url.isFileURL, url.host == nil || url.host == "",
                  url.query == nil, url.fragment == nil,
                  let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
                call.reject("native_file_preview_invalid")
                return
            }
            let root = cache.appendingPathComponent("feria-exports", isDirectory: true).standardizedFileURL
            let normalized = url.standardizedFileURL
            let rootParts = root.resolvingSymlinksInPath().pathComponents
            let parts = normalized.resolvingSymlinksInPath().pathComponents
            guard parts.count == rootParts.count + 2,
                  Array(parts.prefix(rootParts.count)) == rootParts,
                  Array(parts.suffix(2)) == Array(normalized.pathComponents.suffix(2)),
                  UUID(uuidString: parts[rootParts.count]) != nil,
                  normalized.pathExtension.lowercased() == "pdf",
                  (try? FileManager.default.attributesOfItem(atPath: root.path)[.type]) as? FileAttributeType == .typeDirectory,
                  (try? FileManager.default.attributesOfItem(atPath: normalized.deletingLastPathComponent().path)[.type]) as? FileAttributeType == .typeDirectory,
                  let attributes = try? FileManager.default.attributesOfItem(atPath: normalized.path),
                  attributes[.type] as? FileAttributeType == .typeRegular,
                  let size = attributes[.size] as? NSNumber,
                  size.intValue > 0, size.intValue <= 25 * 1024 * 1024 else {
                call.reject("native_file_preview_invalid")
                return
            }
            let controller = QLPreviewController()
            self.pendingCall = call
            self.previewURL = normalized
            self.controller = controller
            controller.dataSource = self
            controller.delegate = self
            presenter.present(controller, animated: true)
        }
    }

    public func numberOfPreviewItems(in controller: QLPreviewController) -> Int { previewURL == nil ? 0 : 1 }

    public func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        return previewURL! as NSURL
    }

    public func previewControllerDidDismiss(_ controller: QLPreviewController) {
        guard self.controller === controller else { return }
        let call = pendingCall
        self.controller = nil
        previewURL = nil
        pendingCall = nil
        call?.resolve()
    }
}
