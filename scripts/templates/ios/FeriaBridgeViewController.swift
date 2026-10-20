import Foundation
import Capacitor

// Next's bundled multi-page export needs its own document on cold navigation.
// Capacitor's default SPA router serves the root HTML for every extensionless URL.
struct FeriaStaticRouter: Router {
    var basePath: String = ""

    func route(for path: String) -> String {
        let root = URL(fileURLWithPath: basePath, isDirectory: true).standardizedFileURL
        let parts = path.split(separator: "/").map(String.init)
        let invalid = parts.contains { $0 == "." || $0 == ".." || $0.contains("\\") || $0.contains("\0") }
        if invalid { return root.appendingPathComponent("404.html").path }
        var candidate = root.appendingPathComponent(parts.joined(separator: "/"))
        if candidate.pathExtension.isEmpty { candidate.appendPathComponent("index.html") }
        candidate = candidate.standardizedFileURL
        var isDirectory: ObjCBool = false
        if candidate.path.hasPrefix(root.path + "/"),
           FileManager.default.fileExists(atPath: candidate.path, isDirectory: &isDirectory),
           !isDirectory.boolValue {
            return candidate.path
        }
        // Missing files must not be mistaken for an unrelated root document.
        return root.appendingPathComponent("404.html").path
    }
}

@objc(FeriaBridgeViewController)
class FeriaBridgeViewController: CAPBridgeViewController {
    override func router() -> Router { FeriaStaticRouter() }
}
