# yks/ — AYT Matematik haritası ve soru bankası

- `harita_verisi.py` — 21 eyalet (konu), bölge, önkoşul, yaklaşık soru ağırlığı, tahmini emek, stratejik sefer sırası → `harita.json`
- `sorular.py` — 28 özgün YKS tarzı soru (her eyalette en az 1). Cevaplar sympy ile bağımsız doğrulanır, her yanlış şık bir hata türüne bağlıdır → `sorular.json`

Ağırlıklar 2018–2025 AYT dağılımlarını özetleyen üç kamuya açık kaynağın yaklaşık ortalamasıdır; limit/türev/integralde kaynaklar çelişir. Kesin karar için ÖSYM kitapçıkları esas alınmalıdır.
Sorular ÖSYM sorularının kopyası değildir; çıkmış soru kalıplarından esinlenen özgün sorulardır. Şıklar küçükten büyüğe dizilidir; uygulamada karıştırılmalıdır.
