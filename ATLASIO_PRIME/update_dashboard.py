import os

html_file = 'dashboard.html'
if os.path.exists(html_file):
    with open(html_file, 'r') as f:
        content = f.read()

    js_script = """
    <script>
    async function updateStats() {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/stats');
            const data = await response.json();
            
            if(document.getElementById('sys-status')) document.getElementById('sys-status').innerText = data.status;
            if(document.getElementById('sys-load')) document.getElementById('sys-load').innerText = data.system_load;
            if(document.getElementById('sys-nodes')) document.getElementById('sys-nodes').innerText = data.active_nodes;
            if(document.getElementById('sys-threat')) document.getElementById('sys-threat').innerText = data.threat_level;
            console.log("Atlasio Veri Akışı: Aktif", data);
        } catch (err) {
            console.log("Yerel köprü bekleniyor...");
        }
    }
    setInterval(updateStats, 2000);
    updateStats();
    </script>
    """
    
    if "updateStats" not in content:
        new_content = content.replace('</body>', js_script + '</body>')
        with open(html_file, 'w') as f:
            f.write(new_content)
        print("✅ Dashboard Canlı Veri Modülü Entegre Edildi.")
    else:
        print("ℹ️ Modül zaten yüklü.")
else:
    print("❌ dashboard.html hala bulunamadı! Lütfen ATLASIO_PRIME klasöründe olduğundan emin ol.")
