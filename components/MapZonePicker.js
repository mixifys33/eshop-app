import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// On web we skip WebView entirely and use a native iframe
const IS_WEB = Platform.OS === 'web';

const buildMapHTML = () => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%;overflow:hidden}
    #hint{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;
      background:rgba(0,0,0,.65);color:#fff;padding:8px 16px;border-radius:20px;
      font:12px sans-serif;white-space:nowrap;pointer-events:none}
    #geocoding{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:2000;background:rgba(255,255,255,.95);padding:12px 20px;border-radius:8px;
      font:13px sans-serif;color:#333;display:none}
    #panel{position:absolute;bottom:0;left:0;right:0;z-index:1000;
      background:#fff;border-radius:14px 14px 0 0;padding:14px 16px 20px;
      box-shadow:0 -2px 12px rgba(0,0,0,.15);display:none}
    #panel.show{display:block}
    #placeName{font:bold 15px sans-serif;color:#222;margin-bottom:3px}
    #coordsText{font:11px sans-serif;color:#888;margin-bottom:12px}
    #saveBtn{width:100%;background:#3498db;color:#fff;border:none;border-radius:10px;
      padding:13px;font:bold 15px sans-serif;cursor:pointer}
    #saveBtn:active{background:#2980b9}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="hint">Tap anywhere on the map to select a delivery zone</div>
  <div id="geocoding">Getting location name…</div>
  <div id="panel">
    <div id="placeName"></div>
    <div id="coordsText"></div>
    <button id="saveBtn" onclick="save()">Save This Zone</button>
  </div>
  <script>
    var map = L.map('map',{zoomControl:true}).setView([1.3733,32.2903],7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap',maxZoom:19
    }).addTo(map);

    var marker=null, selected=null;

    map.on('click',function(e){
      var lat=e.latlng.lat.toFixed(6), lng=e.latlng.lng.toFixed(6);
      if(marker) marker.setLatLng(e.latlng);
      else marker=L.marker(e.latlng).addTo(map);
      document.getElementById('geocoding').style.display='block';
      document.getElementById('panel').classList.remove('show');
      document.getElementById('hint').style.display='none';

      fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+lat+'&lon='+lng+'&zoom=14&addressdetails=1',
        {headers:{'Accept-Language':'en','User-Agent':'EasyShopApp/1.0'}})
      .then(function(r){return r.json()})
      .then(function(d){
        document.getElementById('geocoding').style.display='none';
        var a=d.address||{};
        var name=a.suburb||a.neighbourhood||a.village||a.town||
                 a.city_district||a.county||a.city||a.state_district||
                 a.state||(d.display_name||'').split(',')[0]||lat+','+lng;
        var extra=a.county||a.city||a.state_district||'';
        var full=name+(extra&&extra!==name?', '+extra:'');
        selected={name:full,lat:parseFloat(lat),lng:parseFloat(lng),address:d.display_name||full};
        document.getElementById('placeName').innerText=full;
        document.getElementById('coordsText').innerText=lat+', '+lng;
        document.getElementById('panel').classList.add('show');
      })
      .catch(function(){
        document.getElementById('geocoding').style.display='none';
        var fb=lat+', '+lng;
        selected={name:fb,lat:parseFloat(lat),lng:parseFloat(lng),address:fb};
        document.getElementById('placeName').innerText=fb;
        document.getElementById('coordsText').innerText=fb;
        document.getElementById('panel').classList.add('show');
      });
    });

    function send(data){
      // Works for both WebView (native) and iframe (web)
      try{ window.ReactNativeWebView.postMessage(JSON.stringify(data)); }catch(e){}
      try{ window.parent.postMessage(JSON.stringify(data),'*'); }catch(e){}
    }

    function save(){
      if(selected) send(selected);
    }
  <\/script>
</body>
</html>`;

// ── Web version: plain iframe ─────────────────────────────────────────────
function WebMapPicker({ onSelect, onClose }) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.name && data.lat !== undefined) onSelect(data);
      } catch (_) {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSelect]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Delivery Zone on Map</Text>
      </View>

      {!ready && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={buildMapHTML()}
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
        onLoad={() => setReady(true)}
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Map Zone Picker"
      />
    </View>
  );
}

// ── Native version: WebView ───────────────────────────────────────────────
function NativeMapPicker({ onSelect, onClose }) {
  // Lazy import so web bundle doesn't choke on react-native-webview
  const [WebView, setWebView] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import('react-native-webview').then((mod) => {
      setWebView(() => mod.WebView || mod.default?.WebView || mod.default);
    });
  }, []);

  const handleMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data && data.name) onSelect(data);
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Delivery Zone on Map</Text>
      </View>

      {(!ready || !WebView) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}

      {WebView && (
        <WebView
          source={{ html: buildMapHTML() }}
          style={styles.map}
          onLoadEnd={() => setReady(true)}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
        />
      )}
    </View>
  );
}

export default function MapZonePicker({ onSelect, onClose }) {
  return IS_WEB
    ? <WebMapPicker onSelect={onSelect} onClose={onClose} />
    : <NativeMapPicker onSelect={onSelect} onClose={onClose} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#eee', gap: 12,
  },
  closeBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 80, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8f9fa', zIndex: 10, gap: 12,
  },
  loadingText: { color: '#666', fontSize: 14 },
});
