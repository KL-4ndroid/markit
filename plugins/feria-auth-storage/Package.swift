// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FeriaCapacitorAuthStorage",
    platforms: [.iOS(.v15)],
    products: [.library(name: "FeriaCapacitorAuthStorage", targets: ["FeriaAuthStoragePlugin"])],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.3")
    ],
    targets: [
        .target(
            name: "FeriaAuthStoragePlugin",
            dependencies: [.product(name: "Capacitor", package: "capacitor-swift-pm")],
            path: "ios/Sources/FeriaAuthStoragePlugin",
            linkerSettings: [.linkedFramework("Security")]
        )
    ]
)
