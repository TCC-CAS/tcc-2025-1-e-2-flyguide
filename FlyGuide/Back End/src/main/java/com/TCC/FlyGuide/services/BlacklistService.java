package com.TCC.FlyGuide.services;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.regex.Pattern;


@Service
public class BlacklistService {

    // ── Palavras individuais ──────────────────────────────────────────────────
    private static final List<String> PALAVRAS = List.of(

        // ─ genitália masculina ───────────────────────────────────────────────
        "pinto", "pintos", "pintao",
        "pica", "pika", "pikka", "picca", "picao", "picona", "picudo",
        "piroca", "piroka", "pirocao", "pirokao", "pirocuda",
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
        "buceta", "bucetinha", "bucetona", "bucetao",
        "boceta", "bocetinha", "bocetao",
        "busseta", "buseta", "bct",
        "xota", "xotinha", "xotao",
        "xoxota", "xoxotinha",
        "xereca", "xereka", "xhereca", "xhereka", "xerequinha", "xerecao",
        "chereca", "chereka", "shereca", "shereka",
        "xana", "xaninha",
        "pepeca", "pepeka",
        "xibiu", "xibio",
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
        "foda", "fode", "foder", "fodido", "fodida", "fodasse", "foda-se", "fodase", "fodendo", "fodao",
        "fude", "fuder", "fudido", "fudida", "fudendo", "fudasse", "fudase",
        "trepar", "trepando", "trepada",
        "transar", "transa", "transando",
        "meter", "metendo",
        "fornicar", "fornicando",
        "comer",                   // gíria sexual
        "rachar",                  // gíria sexual
        "chupa", "chupar",         // sentido vulgar
        "mamar", "mamada",
        "gozar", "gozando", "gozo", "gozada",
        "boquete", "boquetinho", "boquetao",
        "punheta", "punheteiro", "punhetando", "punhetinha",
        "siririca", "siriricar", "siririqueira",
        "sexoanal", "sexooral",
        "tesao", "tesudo", "tesuda",
        "sacanagem", "sacana",
        "libertino", "libertina",
        "ninfomaniaca",
        "tarado", "tarada",
        "pervertido", "pervertida",
        "depravado", "depravada",
        "pornô", "porno",
        "puteiro", "pornografia", "pornografico", "pornografica",

        // ─ puta / prostituição ───────────────────────────────────────────────
        "puta", "putas", "putaria", "putinha", "putao", "putona", "puto",
        "prostituta", "meretriz",
        "piranha", "piranhas",
        "piriguete", "piriguetes",
        "galinha",                 // gíria ofensiva

        // ─ porra / merda / bosta / cagar ─────────────────────────────────────
        "porra", "porrada", "porras", "poha", "porrinha",
        "merda", "merdas", "merdinha",
        "bosta", "bostas", "bostinha",
        "cagar", "cagando", "cagada", "cagao",
        "mijar", "mijando", "mijo", "mijao",
        "peido", "peidar",

        // ─ viado / homofobia ─────────────────────────────────────────────────
        "viado", "viadao", "viadinho", "viadagem",
        "veado",                   // outra grafia
        "baitola",
        "boiola",
        "bichona",
        "frango",                  // gíria homofóbica
        "paneleiro",

        // ─ ofensas gerais ────────────────────────────────────────────────────
        "arrombado", "arrombada", "arromba", "arrombadao",
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
        "fuck", "fucker", "fucking", "fucked", "wtf", "stfu",
        "shit", "bitch", "asshole", "bastard",
        "cunt", "whore", "slut", "dickhead",
        "nigger", "nigga", "motherfucker", "cock", "dick",
        "pussy", "ass"
    );

    // ── Frases / siglas coladas ───────────────────────────────────────────────
    private static final List<String> FRASES_COLADAS = List.of(
        "filhodaputa", "filhadaputa", "fiadaputa",
        "fdp", "vsf", "pqp", "krl", "pnc", "tnc", "qpd", "vtnc", "vtmnc",
        "vaisetfoder", "vaisefoder", "vaisefodar", "sefodam",
        "voutematar", "voumatar", "vouteacertar", "vouteestupar",
        "paunocu", "meteopau", "enfiaopau", "vaipaunocu",
        "tomarnorabo", "tomarnoco",
        "putaquepariu",
        "sexoanal", "sexooral",
        "lixohumano", "escoria"
    );

    // Termos mais seguros para detectar mesmo quando o usuario separa letras
    // com ponto, espaco, numero ou simbolo. Evita termos curtos/contextuais.
    private static final List<String> PALAVRAS_OFUSCADAS = List.of(
        "pica", "pika", "pikka", "picca", "piroca", "piroka", "caralho", "cacete",
        "buceta", "boceta", "busseta", "buseta",
        "xereca", "xereka", "xhereca", "xhereka", "chereca", "chereka", "shereca", "shereka",
        "xoxota", "xota", "xana", "pepeca", "pepeka", "xibiu",
        "merda", "bosta", "porra", "poha",
        "puta", "putaria", "piranha", "piriguete",
        "foda", "foder", "fude", "fuder", "boquete", "punheta", "siririca",
        "pornografia", "porno", "puteiro",
        "arrombado", "escroto", "vagabundo", "desgracado",
        "estupro", "estuprador", "estuprar",
        "fuck", "fucker", "fucking", "motherfucker", "bitch", "asshole", "bastard",
        "cunt", "whore", "slut", "dickhead", "cock", "dick", "pussy"
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
             .replace("sh", "x")
             .replace("ch", "x")
             .replace("y", "i")
             .replace("w", "v")
             .replace("k", "c")
             .replace("h", "");

        // Reduz alongamentos comuns usados para burlar filtro: piiika, bucettaa.
        // Mantem "ss" para evitar falso positivo com a palavra inglesa "ass".
        r = r.replaceAll("([aeiou])\\1+", "$1");
        r = r.replaceAll("([bdfgjlmnpqrtvxz])\\1+", "$1");

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

        // 2. Palavras ofuscadas com separadores entre letras
        for (String palavra : PALAVRAS_OFUSCADAS) {
            String norm = normalizarSemEspacos(palavra);
            if (norm.length() < 4) continue;
            if (semEspacos.contains(norm)) {
                return true;
            }
        }
        // 3. Frases / siglas coladas (sem espacos)
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
