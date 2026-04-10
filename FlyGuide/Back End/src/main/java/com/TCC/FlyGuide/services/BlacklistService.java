package com.TCC.FlyGuide.services;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Valida textos contra uma lista de palavras proibidas.
 *
 * Normalização aplicada antes de qualquer verificação:
 *  1. Minúsculas
 *  2. Remove acentos (NFD)
 *  3. Substitui leet speak  (4→a, 3→e, 1→i, 0→o, 5→s, @→a, $→s, k→c …)
 *  4. Palavras simples  → word-boundary (\b) para evitar falsos positivos
 *  5. Frases / siglas coladas → verificação na string sem espaços
 */
@Service
public class BlacklistService {

    // ── Palavras individuais ──────────────────────────────────────────────────
    private static final List<String> PALAVRAS = List.of(

        // ─ genitália masculina ───────────────────────────────────────────────
        "pinto", "pintos", "pintao",
        "piroca", "pirocao", "pirocuda",
        "rola", "rolao",
        "cacete", "cacetada", "cacetao",
        "caralho", "caralhao",
        "neca",
        "pau",                     // contexto vulgar capturado pela IA
        "pênis", "penis",
        "colhao", "colhoes", "colhão",
        "saco",                    // vulgar para testículos
        "ovo", "ovos",             // gíria para testículos
        "tomate",                  // gíria
        "pentelho",                // pelos pubianos
        "broqueta", "broxa",

        // ─ genitália feminina ────────────────────────────────────────────────
        "buceta", "boceta", "busseta", "bucetona", "bocetao",
        "xota", "xotinha", "xotao",
        "xoxota", "xoxotinha",
        "xereca", "xerecao",
        "xana",
        "pepeca",
        "xibiu",
        "grelo",
        "racha", "rachada",
        "vagina",
        "xerecar",

        // ─ ânus / traseiro ───────────────────────────────────────────────────
        "cu", "cus",
        "cuzao", "cuzinho", "cuzuda", "cuzudo",
        "rabo", "rabao",
        "bunda", "bunduda", "bundao",
        "anus",

        // ─ ato sexual ────────────────────────────────────────────────────────
        "foda", "fode", "foder", "fodido", "fodida", "fodasse", "fodendo", "fodao",
        "trepar", "trepando", "trepada",
        "transar", "transa", "transando",
        "meter", "metendo",
        "fornicar", "fornicando",
        "comer",                   // gíria sexual
        "rachar",                  // gíria sexual
        "chupa", "chupar",         // sentido vulgar
        "mamar", "mamada",
        "gozar", "gozando", "gozo", "gozada",
        "boquete",
        "punheta", "punheteiro", "punhetando",
        "siririca", "siriricar",
        "sexoanal", "sexooral",
        "tesao",
        "sacanagem", "sacana",
        "libertino", "libertina",
        "ninfomaniaca",
        "tarado", "tarada",
        "pervertido", "pervertida",
        "depravado", "depravada",
        "pornô", "porno",
        "puteiro",

        // ─ puta / prostituição ───────────────────────────────────────────────
        "puta", "putas", "putaria", "putinha", "putao",
        "prostituta", "meretriz",
        "piranha", "piranhas",
        "piriguete", "piriguetes",
        "galinha",                 // gíria ofensiva

        // ─ porra / merda / bosta / cagar ─────────────────────────────────────
        "porra", "porrada", "porras",
        "merda", "merdas", "merdinha",
        "bosta", "bostas", "bostinha",
        "cagar", "cagando", "cagada", "cagao",
        "mijar", "mijando", "mijo", "mijao",
        "peido", "peidar",

        // ─ viado / homofobia ─────────────────────────────────────────────────
        "viado", "viadao", "viadinho",
        "veado",                   // outra grafia
        "baitola",
        "boiola",
        "bichona",
        "frango",                  // gíria homofóbica
        "paneleiro",

        // ─ ofensas gerais ────────────────────────────────────────────────────
        "arrombado", "arrombada", "arromba",
        "escroto", "escrota",
        "idiota", "idiotas",
        "imbecil", "imbecis",
        "retardado", "retardada",
        "debil",
        "vagabundo", "vagabunda",
        "safado", "safada", "safadeza",
        "desgraca", "desgracado", "desgracada",
        "corno", "corna",
        "otario", "otaria",
        "lixo",

        // ─ racismo / preconceito ─────────────────────────────────────────────
        "crioulo", "crioula",
        "macaco", "macaca",
        "neguinho", "neguinha",
        "negro",                   // captura somente forma ofensiva — IA filtra contexto
        "judia", "judiacao",

        // ─ ameaças / violência ───────────────────────────────────────────────
        "estupro", "estuprador", "estupradora", "estuprar",
        "assassino", "assassina", "matar",
        "traficante",

        // ─ drogas ────────────────────────────────────────────────────────────
        "cocaina", "maconha", "heroina", "crack", "lança",

        // ─ inglês ────────────────────────────────────────────────────────────
        "fuck", "fucker", "fucking", "fucked",
        "shit", "bitch", "asshole", "bastard",
        "cunt", "whore", "slut", "dickhead",
        "nigger", "nigga", "motherfucker", "cock", "dick",
        "pussy", "ass"
    );

    // ── Frases / siglas coladas ───────────────────────────────────────────────
    private static final List<String> FRASES_COLADAS = List.of(
        "filhodaputa", "filhadaputa", "fiadaputa",
        "fdp", "vsf",
        "vaisetfoder", "vaisefoder", "vaisefodar", "sefodam",
        "voutematar", "voumatar", "vouteacertar", "vouteestupar",
        "paunocu", "meteopau", "enfiaopau", "vaipaunocu",
        "tomarnorabo", "tomarnoco",
        "putaquepariu", "pqp",
        "sexoanal", "sexooral",
        "lixohumano", "escoria"
    );

    // ─────────────────────────────────────────────────────────────────────────

    private String normalizarComEspacos(String texto) {
        String r = texto.toLowerCase();

        // Remove acentos
        r = Normalizer.normalize(r, Normalizer.Form.NFD)
                      .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        // Leet speak
        r = r.replace("4", "a")
             .replace("@", "a")
             .replace("3", "e")
             .replace("€", "e")
             .replace("1", "i")
             .replace("|", "i")
             .replace("!", "i")
             .replace("0", "o")
             .replace("5", "s")
             .replace("$", "s")
             .replace("7", "t")
             .replace("+", "t")
             .replace("9", "g")
             .replace("8", "b")
             .replace("6", "g")
             .replace("2", "z")
             .replace("(", "c")
             .replace(")", "o")
             .replace("ph", "f")   // phoda → foda, phuck → fuck
             .replace("k", "c");   // kuzao → cuzao, karalho → caralho

        // Substitui qualquer coisa não alfanumérica por espaço (preserva fronteiras)
        r = r.replaceAll("[^a-z0-9]", " ").trim();
        r = r.replaceAll("\\s+", " ");

        return r;
    }

    private String normalizarSemEspacos(String texto) {
        return normalizarComEspacos(texto).replace(" ", "");
    }

    public boolean contemPalavraProibida(String texto) {
        if (texto == null || texto.isBlank()) return false;

        String comEspacos = normalizarComEspacos(texto);
        String semEspacos = normalizarSemEspacos(texto);

        // 1. Palavras simples com word-boundary
        for (String palavra : PALAVRAS) {
            String norm = normalizarSemEspacos(palavra);
            if (norm.isBlank()) continue;
            Pattern p = Pattern.compile("\\b" + Pattern.quote(norm) + "\\b");
            if (p.matcher(comEspacos).find()) {
                return true;
            }
        }

        // 2. Frases / siglas coladas (sem espaços)
        for (String frase : FRASES_COLADAS) {
            String norm = normalizarSemEspacos(frase);
            if (norm.isBlank()) continue;
            if (semEspacos.contains(norm)) {
                return true;
            }
        }

        return false;
    }
}
