# Private source package; application generation uses Swift Package Manager.
Pod::Spec.new do |s|
  s.name = 'FeriaCapacitorFilePreview'
  s.version = '0.1.0'
  s.summary = 'Private Feria iOS PDF preview bridge'
  s.license = { :type => 'Proprietary' }
  s.homepage = 'https://capacitorjs.com'
  s.author = 'Feria'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor', '8.5.3'
  s.swift_version = '5.9'
  s.frameworks = 'QuickLook'
end
