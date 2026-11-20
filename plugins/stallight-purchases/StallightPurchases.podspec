Pod::Spec.new do |s|
  s.name = 'StallightPurchases'
  s.version = '0.1.0'
  s.summary = 'Private StoreKit 2 bridge for STALLIGHT DAYS'
  s.license = { :type => 'Proprietary' }
  s.homepage = 'https://markit-app-mocha.vercel.app'
  s.author = { 'STALLIGHT DAYS' => 'stallight.days@gmail.com' }
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,mm}'
  s.ios.deployment_target = '16.0'
  s.swift_version = '5.9'
  s.dependency 'Capacitor'
  s.frameworks = 'StoreKit', 'UIKit', 'Security'
end
