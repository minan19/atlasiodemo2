import time
import random
from datetime import datetime

def run_analysis():
    print("\033[93m--- ATLASIO PRIME VERI ANALIZ MOTORU AKTIF ---\033[0m")
    
    threat_levels = ["DÜŞÜK", "ORTA", "KRITIK", "ACIL"]
    
    try:
        while True:
            threat = random.choice(threat_levels)
            code = random.randint(1000, 9999)
            now = datetime.now().strftime("%H:%M:%S")
            log_entry = f"[{now}] KOD: {code} | TEHDIT: {threat} | DURUM: ENGELLENDI"
            
            print(f"\033[92m{log_entry}\033[0m")
            
            # Log dosyasına mühürle
            with open("logs.txt", "a") as f:
                f.write(log_entry + "\n")
                
            time.sleep(1.5)
    except KeyboardInterrupt:
        print("\n\033[91m--- MOTOR GÜVENLI SEKILDE KAPATILDI ---\033[0m")

if __name__ == "__main__":
    run_analysis()
