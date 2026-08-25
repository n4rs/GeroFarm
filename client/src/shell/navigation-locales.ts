import type { SupportedLocale } from "../home-copy";
import type { NavigationGroupId } from "../routing/route-manifest";

type NavigationGroupCopy = Record<NavigationGroupId, string>;
const copy = (overview: string, operation: string, analysis: string, management: string, settings: string): NavigationGroupCopy => ({ overview, operation, analysis, management, settings });

export const navigationGroupCopies: Record<SupportedLocale, NavigationGroupCopy> = {
  "pt-PT": copy("Visão geral", "Operação", "Análise", "Gestão", "Definições"),
  "pt-BR": copy("Visão geral", "Operação", "Análise", "Gestão", "Configurações"),
  en: copy("Overview", "Operations", "Analysis", "Management", "Settings"),
  fr: copy("Vue d’ensemble", "Opérations", "Analyse", "Gestion", "Paramètres"),
  es: copy("Vista general", "Operación", "Análisis", "Gestión", "Configuración"),
  nl: copy("Overzicht", "Uitvoering", "Analyse", "Beheer", "Instellingen"),
  de: copy("Übersicht", "Betrieb", "Analyse", "Verwaltung", "Einstellungen"),
  ja: copy("概要", "作業", "分析", "管理", "設定"),
  he: copy("סקירה", "תפעול", "ניתוח", "ניהול", "הגדרות"),
  tr: copy("Genel bakış", "Operasyon", "Analiz", "Yönetim", "Ayarlar"),
  ar: copy("نظرة عامة", "التشغيل", "التحليل", "الإدارة", "الإعدادات"),
  pl: copy("Przegląd", "Operacje", "Analiza", "Zarządzanie", "Ustawienia"),
  hr: copy("Pregled", "Operativa", "Analiza", "Upravljanje", "Postavke"),
  el: copy("Επισκόπηση", "Λειτουργία", "Ανάλυση", "Διαχείριση", "Ρυθμίσεις"),
  sv: copy("Översikt", "Drift", "Analys", "Hantering", "Inställningar"),
  no: copy("Oversikt", "Drift", "Analyse", "Administrasjon", "Innstillinger"),
  da: copy("Overblik", "Drift", "Analyse", "Administration", "Indstillinger"),
  it: copy("Panoramica", "Operazioni", "Analisi", "Gestione", "Impostazioni"),
  uk: copy("Огляд", "Операції", "Аналіз", "Керування", "Налаштування"),
  ro: copy("Prezentare generală", "Operațiuni", "Analiză", "Gestionare", "Setări"),
  fi: copy("Yleiskatsaus", "Toiminta", "Analyysi", "Hallinta", "Asetukset"),
  bg: copy("Общ преглед", "Операции", "Анализ", "Управление", "Настройки"),
  hu: copy("Áttekintés", "Műveletek", "Elemzés", "Kezelés", "Beállítások"),
  is: copy("Yfirlit", "Rekstur", "Greining", "Stjórnun", "Stillingar"),
  sk: copy("Prehľad", "Prevádzka", "Analýza", "Správa", "Nastavenia"),
  lt: copy("Apžvalga", "Operacijos", "Analizė", "Valdymas", "Nustatymai"),
  sl: copy("Pregled", "Delovanje", "Analiza", "Upravljanje", "Nastavitve"),
  lv: copy("Pārskats", "Darbība", "Analīze", "Pārvaldība", "Iestatījumi"),
};
