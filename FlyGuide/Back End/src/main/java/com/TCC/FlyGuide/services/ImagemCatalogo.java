package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.Imagem;

import java.util.List;

public final class ImagemCatalogo {

    private static final List<String> CHAVES = List.of(
            "cidade", "praia", "natureza", "montanha", "aventura",
            "cultural", "gastronomia", "luxo", "neve", "mochilao",
            "deserto", "fazenda", "cruzeiro", "festival", "spa",
            "parque", "estadio", "oriental", "europa", "familia"
    );

    private ImagemCatalogo() {}

    public static List<Imagem> padrao() {
        return List.of(
                new Imagem(null, "cidade",      "Cidade",              "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=75", "🏙️"),
                new Imagem(null, "praia",       "Praia",               "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=75", "🏖️"),
                new Imagem(null, "natureza",    "Natureza",            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=75", "🌿"),
                new Imagem(null, "montanha",    "Montanha",            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=75", "🏔️"),
                new Imagem(null, "aventura",    "Aventura",            "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&q=75", "🧗"),
                new Imagem(null, "cultural",    "Cultural",            "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&q=75", "🏛️"),
                new Imagem(null, "gastronomia", "Gastronomia",         "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=75", "🍽️"),
                new Imagem(null, "luxo",        "Luxo",                "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=75", "✨"),
                new Imagem(null, "neve",        "Neve / Frio",         "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&q=75", "❄️"),
                new Imagem(null, "mochilao",    "Mochilão",            "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&q=75", "🎒"),
                new Imagem(null, "deserto",     "Deserto",             "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=75", "🏜️"),
                new Imagem(null, "fazenda",     "Fazenda",             "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=75", "🌾"),
                new Imagem(null, "cruzeiro",    "Cruzeiro",            "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&q=75", "🚢"),
                new Imagem(null, "festival",    "Festival",            "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=75", "🎪"),
                new Imagem(null, "spa",         "Spa",                 "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=75", "💆"),
                new Imagem(null, "parque",      "Parque de Diversão",  "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=75", "🎢"),
                new Imagem(null, "estadio",     "Estádio",             "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?w=800&q=75", "⚽"),
                new Imagem(null, "oriental",    "Oriental",            "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=75", "🏯"),
                new Imagem(null, "europa",      "Europa Clássica",     "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=75", "🏰"),
                new Imagem(null, "familia",     "Família",             "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=75", "👨‍👩‍👧")
        );
    }

    public static int ordem(String chave) {
        int idx = CHAVES.indexOf(chave);
        return idx >= 0 ? idx : Integer.MAX_VALUE;
    }

    public static String chavesPermitidasPrompt() {
        return String.join(", ", CHAVES);
    }
}
