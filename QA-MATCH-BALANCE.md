# Maç dengesi — önce/sonra kontrolü

## Sorun ve değişiklik

Eski modelde çok büyük güç farkı, şutun konumu ne olursa olsun neredeyse her şutu net gol fırsatı sayabiliyordu. Ayrıca düşük rastlantısallıkta zayıf takım bazı eşleşmelerde hiç top kazanamıyordu. Artık canlı kadro ve taktikten türetilen güç farkı ile şut bölgesi dikkate alınıyor: savunmanın kapattığı alan bazı net fırsatları daha baskılı şuta dönüştürüyor. Zayıf takımın duran toplar ve boşta kalan toplarla az da olsa top kazanma imkânı var. Bunlar maç sırasında uygulanır; bitmiş skor değiştirilmez, gol sayısına tavan konmaz. Penaltı ve duran top kuralları değiştirilmedi.

## Aynı 15.000 maçlık örneklem

Önceki ve yeni motor, aynı kulüpler, kadrolar, seed'ler, hava koşulları ve kolay/dengeli/efsanevi ayarlarıyla ayrı ayrı çalıştırıldı. Aşağıda **dengeli** zorluktaki, her satırı 1.000 maçlık örneklem var. `7+`, bir takımın en az yedi gol attığı maç; `9+`, toplam en az dokuz gollü maç demektir. Yüzdeler yuvarlatılmıştır.

| Eşleşme | Ortalama gol önce → sonra | Favori galibiyeti önce → sonra | Zayıf galibiyeti önce → sonra | Takım 7+ önce → sonra | Toplam 9+ önce → sonra |
|---|---:|---:|---:|---:|---:|
| Büyük favori ev sahibi | 4,43 → 2,55 | %98,5 → %90,8 | %0,2 → %0,6 | %15,4 → %0,4 | %5,1 → %0,0 |
| Büyük favori deplasman | 4,01 → 2,67 | %96,4 → %90,2 | %0,9 → %1,6 | %10,3 → %2,1 | %2,2 → %0,3 |

Aynı dengeli zorluk örnekleminde normal lig maçlarının ortalama golleri sırasıyla Zirve **2,09 → 2,07**, Geçit **1,92 → 1,88**, Kök **1,96 → 1,90** oldu. Büyük ev favorisinin maçlarında bir takımın xG'sinin 6'yı aşması %11,2'den örneklemde %0,0'a; ilk yarıda toplam 5+ gol %9,8'den %0,7'ye indi. Bu sıfırlar imkânsızlık değil, ilgili 1.000 maçta gözlenmemesi anlamına gelir.

Ayrı 10.000 maçlık normal lig/favori taraması ve düşük–normal–yüksek rastlantısallık ile üç gol temposunun her birleşimini içeren 6.480 maçlık tarama da çalıştırıldı. Bu ikinci taramada nadiren bir takımın 8–10 gol attığı maçlar hâlâ görüldü. Her maçta gol, şut ve xG olay defteriyle karşılaştırıldı. İlgili komutlar `npm run qa:match-core:challenge-balance`, `npm run qa:match-core:wave8:balance` ve `npm run qa:goal-calibration`.

Bu değerler belirli, sentetik kadrolar ve seed'lere ait test sonuçlarıdır; gerçek lig verisi ya da her kariyerde aynı oranların garantisi değildir. Denge sınırları bu örneklem incelenerek seçilmiştir; daha büyük ve farklı kariyer örneklemleri ayrıca değerlidir.

**Bilinen sınır:** Güç farkı yüksek, iki tarafın yüksek pres yaptığı belirli bir kadro eşleşmesinde 600 maçta yalnızca 34 faul ve hiç penaltı görüldü. Aynı örneklemde önceki motor da 27 faul ve bir penaltı üretmişti. Bu, mevcut topa sahip olma modelinde bazı eşleşmelerin faul/penaltı bakımından gerçekçi olmaması demektir; bu çalışmada faul sıklığı yeniden dengelenmedi. Hakem ve duran top testi bu eşleşmeyi korurken dengeli bir eşleşme daha kullanır ve gerçek penaltı → vuruş zincirini de doğrular.

Yeni maçların akışı bilerek değiştiğinden eski sürümün aynı seed ile ürettiği sonuç birebir garanti edilmez. Mevcut kayıt ve maç arşivleri yeniden simüle edilmez veya değiştirilmez; aynı motor sürümünde komutlarla tekrar oynatma deterministiktir. Kayıt şeması ve arşiv sınırı değişmedi.
