var servers = {
  //Bern Address
  bern_address: "https://webtracker.sowi.unibe.ch:10443",

  // Staging IPs and Domains
  staging_address: "https://svko-webtrack.gesis.intra:10443/",
  staging_IP: "https://10.6.9.151:10443/",

  // Production IPs and Domains
  internal_IP: "https://10.4.250.4:10443/",
  internal_address: "https://SVAZWebTrack.gesis.intra:10443/",
  production_IP: "https://51.116.230.66:10443/",
  production_address: "https://webtrack.gesis.org:10443/",
}


var settings = {
  companie: {
    name: "WebTrack"
  },
  id: 'DFG_21',
  lang: 'de',
  project_name: 'Webtrack21',
  versionType: 'v0.10.2',
  mobile: false,
  requireVersion: {
    chrome: 45
  },
  server: servers['staging_address']
}



