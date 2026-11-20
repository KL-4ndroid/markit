// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "StallightPurchases", platforms: [.iOS(.v16)],
    products: [.library(name: "StallightPurchases", targets: ["StallightPurchasesPlugin"])],
    dependencies: [.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.3")],
    targets: [.target(name: "StallightPurchasesPlugin", dependencies: [.product(name: "Capacitor", package: "capacitor-swift-pm")],
        path: "ios/Sources/StallightPurchasesPlugin", linkerSettings: [.linkedFramework("StoreKit"), .linkedFramework("Security")])])
