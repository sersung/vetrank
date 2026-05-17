SET NAMES utf8mb4;

-- Corrige disciplinas
UPDATE disciplines SET
  namePt = 'Ciências Biológicas e Ciclo Básico',
  nameEn = 'Biological Sciences and Basic Cycle'
WHERE id = 1;

UPDATE disciplines SET
  namePt = 'Medicina Veterinária Preventiva e Saúde Pública',
  nameEn = 'Preventive Veterinary Medicine and Public Health'
WHERE id = 2;

UPDATE disciplines SET
  namePt = 'Clínica e Cirurgia Veterinária',
  nameEn = 'Veterinary Clinic and Surgery'
WHERE id = 3;

UPDATE disciplines SET
  namePt = 'Produção Animal e Inspeção de Produtos de Origem Animal',
  nameEn = 'Animal Production, Technology and Inspection'
WHERE id = 4;

UPDATE disciplines SET
  namePt = 'Medicina Veterinária Legal e Ética Profissional',
  nameEn = 'Veterinary Legal Medicine and Professional Ethics'
WHERE id = 5;

-- Corrige assuntos
UPDATE subjects SET namePt = 'Farmacologia Veterinária', nameEn = 'Veterinary Pharmacology' WHERE id = 1;
UPDATE subjects SET namePt = 'Fisiologia Animal', nameEn = 'Animal Physiology' WHERE id = 2;
UPDATE subjects SET namePt = 'Anatomia Veterinária', nameEn = 'Veterinary Anatomy' WHERE id = 3;
UPDATE subjects SET namePt = 'Epidemiologia e Controle de Zoonoses', nameEn = 'Epidemiology and Zoonosis Control' WHERE id = 4;
UPDATE subjects SET namePt = 'Imunização e Vacinação Animal', nameEn = 'Animal Vaccination' WHERE id = 5;
UPDATE subjects SET namePt = 'Clínica de Pequenos Animais', nameEn = 'Small Animal Clinic' WHERE id = 6;
UPDATE subjects SET namePt = 'Cirurgia Geral Veterinária', nameEn = 'General Veterinary Surgery' WHERE id = 7;
UPDATE subjects SET namePt = 'Nutrição e Alimentação Animal', nameEn = 'Animal Nutrition' WHERE id = 8;

SELECT id, namePt FROM disciplines ORDER BY id;
