import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const localesRoot = path.join(repoRoot, 'src', 'locales');
const TARGET_LANGS = ['ar', 'de', 'es', 'fr', 'it'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function translateString(lang, s) {
  const repl = {
    ar: {
      'Cancel': 'إلغاء',
      'Save': 'حفظ',
      'Loading...': 'جارٍ التحميل...',
      'Edit': 'تعديل',
      'New': 'جديد',
      'Save and Apply': 'حفظ وتطبيق',
      'Save and Continue': 'حفظ والمتابعة',
      'Save and Exit': 'حفظ والخروج',
      'Cancel Operation': 'إلغاء العملية',
      'Oluştur': 'إنشاء',
      'Kaydet': 'حفظ',
      'İptal': 'إلغاء',
      'Kapat': 'إغلاق',
      'Düzenle': 'تعديل',
      'Yükleniyor...': 'جارٍ التحميل...',
      'Hata oluştu': 'حدث خطأ',
      'Ara': 'بحث',
      'Create': 'إنشاء',
      'Users': 'المستخدمون',
      'Add': 'إضافة',
      'Publish': 'نشر',
      'Archive': 'أرشيف',
      'Draft': 'مسودة',
    },
    de: {
      'Cancel': 'Abbrechen',
      'Save': 'Speichern',
      'Loading...': 'Laden...',
      'Edit': 'Bearbeiten',
      'New': 'Neu',
      'Save and Apply': 'Speichern und anwenden',
      'Save and Continue': 'Speichern und fortfahren',
      'Save and Exit': 'Speichern und beenden',
      'Cancel Operation': 'Vorgang abbrechen',
      'Oluştur': 'Erstellen',
      'Kaydet': 'Speichern',
      'İptal': 'Abbrechen',
      'Kapat': 'Schließen',
      'Düzenle': 'Bearbeiten',
      'Yükleniyor...': 'Wird geladen...',
      'Hata oluştu': 'Fehler ist aufgetreten',
      'Ara': 'Suchen',
      'Create': 'Erstellen',
      'Users': 'Benutzer',
      'Add': 'Hinzufügen',
      'Publish': 'Veröffentlichen',
      'Archive': 'Archivieren',
      'Draft': 'Entwurf',
    },
    es: {
      'Cancel': 'Cancelar',
      'Save': 'Guardar',
      'Loading...': 'Cargando...',
      'Edit': 'Editar',
      'New': 'Nuevo',
      'Save and Apply': 'Guardar y aplicar',
      'Save and Continue': 'Guardar y continuar',
      'Save and Exit': 'Guardar y salir',
      'Cancel Operation': 'Cancelar la operación',
      'Oluştur': 'Crear',
      'Kaydet': 'Guardar',
      'İptal': 'Cancelar',
      'Kapat': 'Cerrar',
      'Düzenle': 'Editar',
      'Yükleniyor...': 'Cargando...',
      'Hata oluştu': 'Se produjo un error',
      'Ara': 'Buscar',
      'Create': 'Crear',
      'Users': 'Usuarios',
      'Add': 'Agregar',
      'Publish': 'Publicar',
      'Archive': 'Archivar',
      'Draft': 'Borrador',
    },
    fr: {
      'Cancel': 'Annuler',
      'Save': 'Enregistrer',
      'Loading...': 'Chargement...',
      'Edit': 'Modifier',
      'New': 'Nouveau',
      'Save and Apply': 'Enregistrer et appliquer',
      'Save and Continue': 'Enregistrer et continuer',
      'Save and Exit': 'Enregistrer et quitter',
      'Cancel Operation': 'Annuler l’opération',
      'Oluştur': 'Créer',
      'Kaydet': 'Enregistrer',
      'İptal': 'Annuler',
      'Kapat': 'Fermer',
      'Düzenle': 'Modifier',
      'Yükleniyor...': 'Chargement...',
      'Hata oluştu': 'Une erreur est survenue',
      'Ara': 'Rechercher',
      'Create': 'Créer',
      'Users': 'Utilisateurs',
      'Add': 'Ajouter',
      'Publish': 'Publier',
      'Archive': 'Archiver',
      'Draft': 'Brouillon',
    },
    it: {
      'Cancel': 'Annulla',
      'Save': 'Salva',
      'Loading...': 'Caricamento...',
      'Edit': 'Modifica',
      'New': 'Nuovo',
      'Save and Apply': 'Salva e applica',
      'Save and Continue': 'Salva e continua',
      'Save and Exit': 'Salva ed esci',
      'Cancel Operation': 'Annulla l’operazione',
      'Oluştur': 'Crea',
      'Kaydet': 'Salva',
      'İptal': 'Annulla',
      'Kapat': 'Chiudi',
      'Düzenle': 'Modifica',
      'Yükleniyor...': 'Caricamento...',
      'Hata oluştu': 'Si è verificato un errore',
      'Ara': 'Cerca',
      'Create': 'Crea',
      'Users': 'Utenti',
      'Add': 'Aggiungi',
      'Publish': 'Pubblica',
      'Archive': 'Archivia',
      'Draft': 'Bozza',
    },
  };

  const map = repl[lang];
  if (!map) return s;

  // Exact whole-string replacements first (avoid partial replacements causing awkward results).
  if (Object.prototype.hasOwnProperty.call(map, s)) return map[s];

  // Then common phrase replacements.
  // We keep this intentionally conservative: only replace known phrases/words.
  let out = s;
  const phraseKeys = [
    'Save and Apply',
    'Save and Continue',
    'Save and Exit',
    'Cancel Operation',
    'Loading...',
  ];
  for (const k of phraseKeys) {
    if (out.includes(k)) out = out.split(k).join(map[k]);
  }

  // Word replacements for small tokens.
  const wordMap = {
    Cancel: map.Cancel,
    Save: map.Save,
    Edit: map.Edit,
    New: map.New,
    Create: map.Create,
    Users: map.Users,
    Add: map.Add,
    Publish: map.Publish,
    Archive: map.Archive,
    Draft: map.Draft,
  };
  for (const [token, translated] of Object.entries(wordMap)) {
    const re = new RegExp(`\\b${token}\\b`, 'gi');
    out = out.replace(re, translated);
  }

  // Turkish tokens that may exist as fallbacks.
  const turkishMap = {
    Oluştur: map.Oluştur,
    Kaydet: map.Kaydet,
    İptal: map['İptal'],
    Kapat: map.Kapat,
    Düzenle: map.Düzenle,
    Ara: map.Ara,
    'Hata oluştu': map['Hata oluştu'],
  };
  for (const [token, translated] of Object.entries(turkishMap)) {
    if (!token) continue;
    out = out.split(token).join(translated);
  }

  return out;
}

function walkAndTranslate(obj, lang) {
  if (typeof obj === 'string') return translateString(lang, obj);
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => walkAndTranslate(v, lang));

  const next = obj;
  for (const [k, v] of Object.entries(next)) {
    next[k] = walkAndTranslate(v, lang);
  }
  return next;
}

function main() {
  for (const lang of TARGET_LANGS) {
    const langDir = path.join(localesRoot, lang);
    if (!fs.existsSync(langDir)) continue;
    const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.json'));
    for (const fileName of files) {
      const filePath = path.join(langDir, fileName);
      const json = readJson(filePath);
      const translated = walkAndTranslate(json, lang);
      writeJson(filePath, translated);
    }
  }
}

main();

