/* ============================================================================
   BOENY NECTAR — FRONTEND GITHUB PAGES + BACKEND KOBOTOOLBOX
   Version : 2026-09-13

   IMPORTANT — choix demandé : le token Kobo est conservé directement ici.
   Sur GitHub Pages, toute personne peut lire ce token dans le code source ou
   dans les requêtes réseau. Utilisez de préférence un compte/token limité aux
   seuls projets Boeny Nectar et révoquez immédiatement le token en cas de fuite.

   AUCUN data.json LOCAL N'EST UTILISÉ.
   - Lecture CMS : KPI API v2 /api/v2/assets/{uid}/data/
   - Création commande : OpenRosa https://kc.kobotoolbox.org/submission
   ============================================================================ */

"use strict";

const KOBO = Object.freeze({
    TOKEN: "3de4015cc91f3ede644661cda752da17cb928401",

    KPI_BASE_URL: "https://kf.kobotoolbox.org",
    OPENROSA_SUBMISSION_URL: "https://kc.kobotoolbox.org/submission",

    // Facultatif : laissez vide pour la détection automatique par nom de projet.
    CMS_ASSET_UID: "",
    ORDERS_ASSET_UID: "",

    CMS_PROJECT_NAME: "Boeny Nectar — CMS dynamique du site",
    ORDERS_PROJECT_NAME: "Boeny Nectar — Commandes clients",

    // Correspondent au fichier Boeny_Nectar_Kobo_Commandes.xlsx fourni.
    ORDERS_FORM_ID: "boeny_nectar_orders",
    ORDERS_FORM_VERSION: "2026091301"
});

let CMS_ASSET_UID_RESOLVED = null;
let ORDERS_ASSET_UID_RESOLVED = null;
let ORDERS_ASSET_META = null;
let CURRENT_SITE_DATA = null;
const OBJECT_URLS = [];

/* --------------------------- OUTILS GÉNÉRAUX --------------------------- */

function tokenIsConfigured() {
    return Boolean(KOBO.TOKEN && !KOBO.TOKEN.includes("COLLEZ_ICI"));
}

function authHeaders(extra = {}) {
    return { Authorization: `Token ${KOBO.TOKEN}`, ...extra };
}

function showStatus(message, type = "info", persistent = true) {
    const box = document.getElementById("kobo-status");
    if (!box) return;
    if (!message) {
        box.innerHTML = "";
        return;
    }
    box.innerHTML = `<div class="alert alert-${type} shadow-sm" role="alert">${message}</div>`;
    if (!persistent) setTimeout(() => { box.innerHTML = ""; }, 5000);
}

function setText(id, value = "") {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "";
}

function setPlaceholder(id, value = "") {
    const el = document.getElementById(id);
    if (el) el.placeholder = value ?? "";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeXml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function toBoolYes(value) {
    return String(value ?? "yes").toLowerCase() !== "no";
}

function numericOrder(value, fallback = 999999) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function byOrder(field) {
    return (a, b) => numericOrder(a[field]) - numericOrder(b[field]);
}

function getNested(obj, slashPath) {
    if (!obj || !slashPath) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, slashPath)) return obj[slashPath];
    const parts = slashPath.split("/");
    let cur = obj;
    for (const p of parts) {
        if (cur && typeof cur === "object" && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
        else return undefined;
    }
    return cur;
}

/**
 * Kobo renvoie souvent les groupes sous forme de clés "groupe/champ" et les
 * répétitions comme "groupe/repeat". Ce helper accepte aussi une structure
 * imbriquée afin que le frontend reste robuste.
 */
function valueOf(obj, ...candidateKeys) {
    for (const key of candidateKeys) {
        const direct = getNested(obj, key);
        if (direct !== undefined && direct !== null) return direct;

        const short = key.includes("/") ? key.split("/").pop() : key;
        if (obj && Object.prototype.hasOwnProperty.call(obj, short)) return obj[short];

        if (obj && typeof obj === "object") {
            const suffix = "/" + short;
            const foundKey = Object.keys(obj).find(k => k === short || k.endsWith(suffix));
            if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) return obj[foundKey];
        }
    }
    return undefined;
}

function repeatOf(submission, fullPath, shortName) {
    const direct = valueOf(submission, fullPath, shortName);
    return Array.isArray(direct) ? direct : [];
}

function absoluteKoboUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${KOBO.KPI_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/* --------------------------- API KOBO : PROJETS --------------------------- */

async function koboFetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: authHeaders(options.headers || {})
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Kobo HTTP ${response.status} — ${body || response.statusText}`);
    }
    return response.json();
}

async function listAllSurveyAssets() {
    let url = `${KOBO.KPI_BASE_URL}/api/v2/assets/?asset_type=survey&limit=100`;
    const assets = [];
    while (url) {
        const page = await koboFetchJson(url);
        assets.push(...(page.results || []));
        url = page.next || null;
    }
    return assets;
}

async function resolveAssetUid(configuredUid, expectedName) {
    if (configuredUid && !configuredUid.includes("COLLEZ_ICI")) return configuredUid;
    const assets = await listAllSurveyAssets();
    const matches = assets.filter(a => String(a.name || "").trim() === expectedName.trim());
    if (!matches.length) {
        throw new Error(`Projet Kobo introuvable : « ${expectedName} ». Importez puis déployez le XLSForm correspondant.`);
    }
    const deployed = matches.find(a => a.deployment__active) || matches[0];
    return deployed.uid;
}

async function resolveProjectUids() {
    CMS_ASSET_UID_RESOLVED = await resolveAssetUid(KOBO.CMS_ASSET_UID, KOBO.CMS_PROJECT_NAME);
    ORDERS_ASSET_UID_RESOLVED = await resolveAssetUid(KOBO.ORDERS_ASSET_UID, KOBO.ORDERS_PROJECT_NAME);
}

/* --------------------------- API KOBO : CMS --------------------------- */

async function getAllCmsSubmissions() {
    let url = `${KOBO.KPI_BASE_URL}/api/v2/assets/${encodeURIComponent(CMS_ASSET_UID_RESOLVED)}/data/?limit=1000`;
    const rows = [];
    while (url) {
        const page = await koboFetchJson(url);
        rows.push(...(page.results || []));
        url = page.next || null;
    }
    return rows;
}

function selectPublishedCmsSubmission(rows) {
    if (!rows.length) throw new Error("Le formulaire CMS Kobo ne contient encore aucune soumission.");

    const published = rows.filter(row => String(valueOf(row, "meta/publication_status", "publication_status") || "").toLowerCase() === "published");
    const candidates = published.length ? published : rows;
    candidates.sort((a, b) => Number(b._id || 0) - Number(a._id || 0));
    return candidates[0];
}

async function attachmentToObjectUrl(submission, fileName) {
    if (!fileName) return "";
    const attachments = Array.isArray(submission._attachments) ? submission._attachments : [];
    const normalized = String(fileName).split("/").pop();
    const att = attachments.find(a => {
        const f = String(a.filename || a.media_file_basename || "");
        return f === fileName || f.endsWith("/" + normalized) || f.split("/").pop() === normalized;
    });
    if (!att) return "";

    const rawUrl = att.download_url || att.url || att.content || "";
    if (!rawUrl) return "";

    try {
        const resp = await fetch(absoluteKoboUrl(rawUrl), { headers: authHeaders() });
        if (!resp.ok) throw new Error(`Image HTTP ${resp.status}`);
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        OBJECT_URLS.push(objectUrl);
        return objectUrl;
    } catch (e) {
        console.warn("Impossible de charger une image Kobo :", e);
        return "";
    }
}

async function resolveMedia(submission, source, urlValue, fileValue) {
    if (String(source || "url").toLowerCase() === "kobo") {
        return (await attachmentToObjectUrl(submission, fileValue)) || urlValue || "";
    }
    return urlValue || "";
}

async function transformCmsSubmission(s) {
    const heroRepeats = repeatOf(s, "hero/hero_images", "hero_images");
    const heroImages = await Promise.all(heroRepeats.filter(x => toBoolYes(valueOf(x, "hero_img_active"))).map(async x => ({
        order: numericOrder(valueOf(x, "hero_img_order")),
        src: await resolveMedia(s, valueOf(x, "hero_img_source"), valueOf(x, "hero_img_url"), valueOf(x, "hero_img_file")),
        alt: valueOf(x, "hero_img_alt") || "Image Boeny Nectar"
    })));
    heroImages.sort(byOrder("order"));

    const advantageItems = repeatOf(s, "advantages/advantage_items", "advantage_items")
        .filter(x => toBoolYes(valueOf(x, "adv_active")))
        .map(x => ({ order: numericOrder(valueOf(x, "adv_order")), icon: valueOf(x, "adv_icon") || "", title: valueOf(x, "adv_title") || "", description: valueOf(x, "adv_description") || "" }))
        .sort(byOrder("order"));

    const processSteps = repeatOf(s, "process/process_steps", "process_steps")
        .filter(x => toBoolYes(valueOf(x, "process_active")))
        .map(x => ({ order: numericOrder(valueOf(x, "process_order")), icon: valueOf(x, "process_icon") || "", title: valueOf(x, "process_step_title") || "", description: valueOf(x, "process_description") || "" }))
        .sort(byOrder("order"));

    const terroirPoints = repeatOf(s, "terroir/terroir_points", "terroir_points")
        .filter(x => toBoolYes(valueOf(x, "terroir_point_active")))
        .map(x => ({ order: numericOrder(valueOf(x, "terroir_point_order")), title: valueOf(x, "terroir_point_title") || "", description: valueOf(x, "terroir_point_desc") || "" }))
        .sort(byOrder("order"));

    const drinkRepeats = repeatOf(s, "drinks/drink_items", "drink_items");
    const drinkItems = await Promise.all(drinkRepeats.filter(x => toBoolYes(valueOf(x, "drink_active"))).map(async x => ({
        order: numericOrder(valueOf(x, "drink_order")),
        title: valueOf(x, "drink_title") || "",
        price: valueOf(x, "drink_price") || "",
        description: valueOf(x, "drink_description") || "",
        image: await resolveMedia(s, valueOf(x, "drink_img_source"), valueOf(x, "drink_img_url"), valueOf(x, "drink_img_file")),
        alt: valueOf(x, "drink_img_alt") || valueOf(x, "drink_title") || "Produit",
        buttonLabel: valueOf(x, "drink_button_label") || "Commander"
    })));
    drinkItems.sort(byOrder("order"));

    const testimonials = repeatOf(s, "testimonials/testimonial_items", "testimonial_items")
        .filter(x => toBoolYes(valueOf(x, "testimonial_active")))
        .map(x => ({
            order: numericOrder(valueOf(x, "testimonial_order")),
            name: valueOf(x, "testimonial_name") || "",
            rating: valueOf(x, "testimonial_rating_display") || "⭐".repeat(Math.max(0, Math.min(5, Number(valueOf(x, "testimonial_rating")) || 0))),
            text: valueOf(x, "testimonial_text") || ""
        })).sort(byOrder("order"));

    const faqItems = repeatOf(s, "faq/faq_items", "faq_items")
        .filter(x => toBoolYes(valueOf(x, "faq_active")))
        .map(x => ({ order: numericOrder(valueOf(x, "faq_order")), q: valueOf(x, "faq_question") || "", a: valueOf(x, "faq_answer") || "" }))
        .sort(byOrder("order"));

    const directOptions = repeatOf(s, "order_ui/direct_options", "direct_options")
        .filter(x => toBoolYes(valueOf(x, "direct_active")))
        // L'import JSON n'a plus de raison d'être : Kobo est désormais la source.
        .filter(x => valueOf(x, "direct_key") !== "import_json")
        .map(x => ({
            order: numericOrder(valueOf(x, "direct_order")),
            key: valueOf(x, "direct_key") || "other",
            label: valueOf(x, "direct_label") || "Action",
            url: valueOf(x, "direct_url") || "#",
            color: valueOf(x, "direct_color") || "dark"
        })).sort(byOrder("order"));

    const socialLinks = repeatOf(s, "about/social_links", "social_links")
        .filter(x => toBoolYes(valueOf(x, "social_active")))
        .map(x => ({ order: numericOrder(valueOf(x, "social_order")), platform: valueOf(x, "social_platform") || "", url: valueOf(x, "social_url") || "#", color: valueOf(x, "social_color") || "light" }))
        .sort(byOrder("order"));

    return {
        brandName: valueOf(s, "meta/brand_name", "brand_name") || "Boeny Nectar",
        cmsVersion: valueOf(s, "meta/cms_version", "cms_version") || "",
        navigation: {
            process: valueOf(s, "navigation/nav_process", "nav_process") || "Fabrication",
            products: valueOf(s, "navigation/nav_products", "nav_products") || "Boissons",
            testimonials: valueOf(s, "navigation/nav_testimonials", "nav_testimonials") || "Avis",
            faq: valueOf(s, "navigation/nav_faq", "nav_faq") || "FAQ",
            about: valueOf(s, "navigation/nav_about", "nav_about") || "À Propos",
            email: valueOf(s, "navigation/nav_email", "nav_email") || "Email",
            emailHref: valueOf(s, "navigation/nav_email_href", "nav_email_href") || "email_Javascript.html",
            order: valueOf(s, "navigation/nav_order", "nav_order") || "Commander"
        },
        hero: {
            headline: valueOf(s, "hero/hero_headline", "hero_headline") || "",
            subheadline: valueOf(s, "hero/hero_subheadline", "hero_subheadline") || "",
            ctaText: valueOf(s, "hero/hero_cta_text", "hero_cta_text") || "Commander",
            images: heroImages
        },
        advantages: { title: valueOf(s, "advantages/advantages_title", "advantages_title") || "", items: advantageItems },
        process: { title: valueOf(s, "process/process_title", "process_title") || "", steps: processSteps },
        terroir: {
            title: valueOf(s, "terroir/terroir_title", "terroir_title") || "",
            lead: valueOf(s, "terroir/terroir_lead", "terroir_lead") || "",
            image: await resolveMedia(s, valueOf(s, "terroir/terroir_img_source", "terroir_img_source"), valueOf(s, "terroir/terroir_img_url", "terroir_img_url"), valueOf(s, "terroir/terroir_img_file", "terroir_img_file")),
            alt: valueOf(s, "terroir/terroir_img_alt", "terroir_img_alt") || "Le terroir du Boeny",
            points: terroirPoints
        },
        drinks: { title: valueOf(s, "drinks/drinks_title", "drinks_title") || "", items: drinkItems },
        testimonials: { title: valueOf(s, "testimonials/testimonials_title", "testimonials_title") || "", items: testimonials },
        faq: { title: valueOf(s, "faq/faq_title", "faq_title") || "", items: faqItems },
        order: {
            modalTitle: valueOf(s, "order_ui/order_modal_title", "order_modal_title") || "Finaliser ma commande",
            modalSubtitle: valueOf(s, "order_ui/order_modal_subtitle", "order_modal_subtitle") || "",
            paymentNotice: valueOf(s, "order_ui/payment_notice", "payment_notice") || "",
            mvolaPhone: valueOf(s, "order_ui/seller_mvola_phone", "seller_mvola_phone") || "",
            mvolaOwner: valueOf(s, "order_ui/seller_mvola_owner", "seller_mvola_owner") || "",
            directTitle: valueOf(s, "order_ui/direct_options_title", "direct_options_title") || "",
            options: directOptions
        },
        clientForm: {
            title: valueOf(s, "client_form_ui/client_form_title", "client_form_title") || "Informations sur le client :",
            name: valueOf(s, "client_form_ui/client_name_placeholder", "client_name_placeholder") || "Nom et Prénom du client",
            email: valueOf(s, "client_form_ui/client_email_placeholder", "client_email_placeholder") || "Email du client",
            contact: valueOf(s, "client_form_ui/client_contact_placeholder", "client_contact_placeholder") || "Contact du client",
            country: valueOf(s, "client_form_ui/client_country_placeholder", "client_country_placeholder") || "Pays de destination",
            address: valueOf(s, "client_form_ui/client_address_placeholder", "client_address_placeholder") || "Adresse de destination",
            payment: valueOf(s, "client_form_ui/client_payment_placeholder", "client_payment_placeholder") || "Référence du paiement",
            message: valueOf(s, "client_form_ui/client_message_placeholder", "client_message_placeholder") || "Détail des articles achetés"
        },
        about: {
            title: valueOf(s, "about/about_title", "about_title") || "",
            description: valueOf(s, "about/about_description", "about_description") || "",
            contactHeading: valueOf(s, "about/contact_heading", "contact_heading") || "Contact",
            address: valueOf(s, "about/about_address", "about_address") || "",
            phone: valueOf(s, "about/about_phone", "about_phone") || "",
            email: valueOf(s, "about/about_email", "about_email") || "",
            socialsHeading: valueOf(s, "about/socials_heading", "socials_heading") || "Réseaux Sociaux",
            socialLinks
        },
        footer: { copyright: valueOf(s, "footer_system/footer_copyright", "footer_copyright") || "" },
        system: {
            socialCopyMessage: valueOf(s, "footer_system/msg_social_copy", "msg_social_copy") || "Infos copiées dans le presse-papiers."
        }
    };
}

/* --------------------------- RENDU DU SITE --------------------------- */

function renderSite(data) {
    CURRENT_SITE_DATA = data;
    document.title = `${data.brandName}${data.hero.headline ? " | " + data.hero.headline : ""}`;

    setText("nav-brand", data.brandName);
    setText("nav-process-label", data.navigation.process);
    setText("nav-products-label", data.navigation.products);
    setText("nav-testimonials-label", data.navigation.testimonials);
    setText("nav-faq-label", data.navigation.faq);
    setText("nav-about-label", data.navigation.about);
    setText("nav-email-label", data.navigation.email);
    setText("nav-order-label", data.navigation.order);
    const emailLink = document.getElementById("nav-email-label");
    if (emailLink) emailLink.href = data.navigation.emailHref;

    setText("hero-headline", data.hero.headline);
    setText("hero-subheadline", data.hero.subheadline);
    setText("hero-cta", data.hero.ctaText);
    const heroContainer = document.getElementById("hero-carousel-inner");
    heroContainer.innerHTML = "";
    data.hero.images.forEach((img, index) => {
        const div = document.createElement("div");
        div.className = `carousel-item h-100 ${index === 0 ? "active" : ""}`;
        div.innerHTML = `<img src="${escapeHtml(img.src)}" class="d-block w-100 h-100" style="object-fit:cover" alt="${escapeHtml(img.alt)}">`;
        heroContainer.appendChild(div);
    });

    setText("adv-title", data.advantages.title);
    const advContainer = document.getElementById("adv-container");
    advContainer.innerHTML = data.advantages.items.map(adv => `
        <div class="col-12 col-md-4">
            <div class="p-4 bg-light rounded-4 h-100 transition-hover border-0 shadow-sm">
                <div class="display-3 mb-3">${escapeHtml(adv.icon)}</div>
                <h4 class="fw-bold">${escapeHtml(adv.title)}</h4>
                <p class="text-muted mb-0">${escapeHtml(adv.description)}</p>
            </div>
        </div>`).join("");

    setText("process-title", data.process.title);
    const processContainer = document.getElementById("process-container");
    processContainer.innerHTML = data.process.steps.map(step => `
        <div class="col-12 col-md-4">
            <div class="process-card p-4 h-100">
                <div class="process-icon bg-warning text-dark mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle display-4 shadow" style="width:100px;height:100px;">${escapeHtml(step.icon)}</div>
                <h4 class="fw-bold">${escapeHtml(step.title)}</h4>
                <p class="text-muted">${escapeHtml(step.description)}</p>
            </div>
        </div>`).join("");

    setText("terroir-title", data.terroir.title);
    setText("terroir-lead", data.terroir.lead);
    const terroirImage = document.getElementById("terroir-image");
    terroirImage.src = data.terroir.image || "";
    terroirImage.alt = data.terroir.alt || "";
    document.getElementById("terroir-points-container").innerHTML = data.terroir.points.map(p => `
        <div class="mb-3"><h5 class="fw-bold text-dark"><i class="text-warning me-2">📍</i>${escapeHtml(p.title)}</h5><p class="text-muted">${escapeHtml(p.description)}</p></div>`).join("");

    setText("drinks-title", data.drinks.title);
    document.getElementById("drinks-container").innerHTML = data.drinks.items.map(drink => `
        <div class="col-12 col-md-6 col-lg-4 d-flex align-items-stretch">
            <div class="card w-100 shadow-sm border-0 h-100 transition-hover rounded-4 overflow-hidden">
                <img src="${escapeHtml(drink.image)}" class="card-img-top" alt="${escapeHtml(drink.alt)}" style="height:250px;object-fit:contain;background-color:#f8f9fa;">
                <div class="card-body d-flex flex-column p-4">
                    <h5 class="card-title fw-bold fs-4">${escapeHtml(drink.title)}</h5>
                    <h6 class="card-subtitle mb-3 text-warning fw-bold fs-4">${escapeHtml(drink.price)}</h6>
                    <p class="card-text text-muted flex-grow-1">${escapeHtml(drink.description)}</p>
                    <button class="btn btn-outline-dark rounded-pill w-100 mt-auto fw-bold py-2" data-bs-toggle="modal" data-bs-target="#orderModal">${escapeHtml(drink.buttonLabel)}</button>
                </div>
            </div>
        </div>`).join("");

    setText("testi-title", data.testimonials.title);
    document.getElementById("testi-container").innerHTML = data.testimonials.items.map(review => `
        <div class="col-12 col-md-4"><div class="card h-100 border-0 shadow-sm bg-light rounded-4 p-4"><div class="card-body">
            <div class="mb-3 fs-5">${escapeHtml(review.rating)}</div>
            <p class="card-text fst-italic mb-4">“${escapeHtml(review.text)}”</p>
            <h6 class="fw-bold mb-0 text-warning">- ${escapeHtml(review.name)}</h6>
        </div></div></div>`).join("");

    setText("faq-title", data.faq.title);
    document.getElementById("faq-accordion").innerHTML = data.faq.items.map((q, i) => `
        <div class="accordion-item border-0 mb-3 shadow-sm rounded-4 overflow-hidden">
            <h2 class="accordion-header" id="heading${i}"><button class="accordion-button collapsed fw-bold fs-5 bg-white" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${i}" aria-expanded="false" aria-controls="collapse${i}">${escapeHtml(q.q)}</button></h2>
            <div id="collapse${i}" class="accordion-collapse collapse" data-bs-parent="#faq-accordion"><div class="accordion-body text-muted bg-white">${escapeHtml(q.a)}</div></div>
        </div>`).join("");

    setText("modal-title", data.order.modalTitle);
    setText("modal-subtitle", data.order.modalSubtitle);
    document.getElementById("modal-notice").innerHTML = data.order.paymentNotice ? `
        <div class="alert alert-warning border-start border-warning border-4 shadow-sm mb-4 text-start">
            <div class="d-flex mb-3"><div class="fs-2 me-3 align-self-center">⚠️</div><div class="text-dark" style="font-size:.95rem;">1) ${data.order.paymentNotice}</div></div>
            <hr class="border-warning opacity-50">
            <div class="text-dark" style="font-size:.95rem;">2) Paiement MVOLA au numéro <b class="text-primary">${escapeHtml(data.order.mvolaPhone)}</b> au nom de <b class="text-primary">${escapeHtml(data.order.mvolaOwner)}</b>.</div>
        </div>` : "";

    setText("client-form-title", data.clientForm.title);
    setPlaceholder("clientName", data.clientForm.name);
    setPlaceholder("clientEmail", data.clientForm.email);
    setPlaceholder("clientContact", data.clientForm.contact);
    setPlaceholder("clientCountry", data.clientForm.country);
    setPlaceholder("clientAddress", data.clientForm.address);
    setPlaceholder("clientPaymentRef", data.clientForm.payment);
    setPlaceholder("clientMessage", data.clientForm.message);

    setText("direct-title", data.order.directTitle);
    const directContainer = document.getElementById("direct-buttons-container");
    directContainer.innerHTML = data.order.options.map(op => {
        const special = ["download", "download_json"].includes(op.key) ? " mt-2 border-2" : "";
        return `<button type="submit" data-platform="${escapeHtml(op.key)}" data-url="${escapeHtml(op.url)}" class="btn btn-outline-${escapeHtml(op.color)} btn-lg fw-bold w-100 shadow-sm transition-hover${special}">${["download", "download_json"].includes(op.key) ? escapeHtml(op.label) : "Contacter via " + escapeHtml(op.label)}</button>`;
    }).join("");

    setText("about-title", data.about.title);
    setText("about-desc", data.about.description);
    setText("contact-heading", data.about.contactHeading);
    setText("about-address", data.about.address);
    setText("about-phone", data.about.phone);
    setText("about-email", data.about.email);
    setText("socials-heading", data.about.socialsHeading);
    document.getElementById("about-socials").innerHTML = data.about.socialLinks.map(link => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="btn btn-outline-${escapeHtml(link.color)} rounded-circle fw-bold shadow-sm" title="${escapeHtml(link.platform)}">${escapeHtml(link.platform.substring(0, 2))}</a>`).join("");
    setText("footer-copyright", data.footer.copyright);

    document.querySelectorAll(".reveal").forEach(el => OBSERVER.observe(el));
}

/* --------------------------- KOBO : SOUMISSION COMMANDE --------------------------- */

function uuidV4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function isoNow() {
    return new Date().toISOString();
}

async function getOrdersAssetMeta() {
    if (ORDERS_ASSET_META) return ORDERS_ASSET_META;
    ORDERS_ASSET_META = await koboFetchJson(`${KOBO.KPI_BASE_URL}/api/v2/assets/${encodeURIComponent(ORDERS_ASSET_UID_RESOLVED)}/`);
    return ORDERS_ASSET_META;
}

function preferredChannelFromPlatform(platform) {
    const allowed = new Set(["email", "whatsapp", "sms", "phone", "messenger", "instagram", "linkedin"]);
    return allowed.has(platform) ? platform : "email";
}

function buildOrderXml(infos, platform, deploymentUuid) {
    const instanceId = `uuid:${uuidV4()}`;
    const now = isoNow();
    const formId = KOBO.ORDERS_FORM_ID;
    const version = KOBO.ORDERS_FORM_VERSION;

    return `<?xml version="1.0" encoding="UTF-8"?>
<${formId} id="${escapeXml(formId)}" version="${escapeXml(version)}">
  <client>
    <client_name>${escapeXml(infos.nom)}</client_name>
    <client_email>${escapeXml(infos.email)}</client_email>
    <client_contact>${escapeXml(infos.contact)}</client_contact>
  </client>
  <delivery>
    <destination_country>${escapeXml(infos.pays)}</destination_country>
    <destination_address>${escapeXml(infos.adresse)}</destination_address>
  </delivery>
  <payment>
    <payment_method>mvola</payment_method>
    <payment_reference>${escapeXml(infos.ref_paiement)}</payment_reference>
  </payment>
  <order_details>
    <order_message>${escapeXml(infos.msg)}</order_message>
    <preferred_channel>${escapeXml(preferredChannelFromPlatform(platform))}</preferred_channel>
  </order_details>
  <started_at>${escapeXml(now)}</started_at>
  <finished_at>${escapeXml(now)}</finished_at>
  <formhub><uuid>${escapeXml(deploymentUuid || "")}</uuid></formhub>
  <meta><instanceID>${escapeXml(instanceId)}</instanceID></meta>
</${formId}>`;
}

async function submitOrderToKobo(infos, platform) {
    const meta = await getOrdersAssetMeta();
    if (!meta.deployment__active) throw new Error("Le formulaire Kobo « Commandes clients » n'est pas déployé.");

    const xml = buildOrderXml(infos, platform, meta.deployment__uuid);
    const formData = new FormData();
    formData.append("xml_submission_file", new Blob([xml], { type: "text/xml" }), `boeny_${Date.now()}.xml`);

    const response = await fetch(KOBO.OPENROSA_SUBMISSION_URL, {
        method: "POST",
        headers: authHeaders({ "X-OpenRosa-Version": "1.0" }),
        body: formData
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`Soumission Kobo refusée (${response.status}) : ${text || response.statusText}`);
    return text;
}

/* --------------------------- COMMANDES / CANAUX --------------------------- */

function readOrderForm() {
    return {
        nom: document.getElementById("clientName").value.trim(),
        email: document.getElementById("clientEmail").value.trim(),
        contact: document.getElementById("clientContact").value.trim(),
        pays: document.getElementById("clientCountry").value.trim(),
        adresse: document.getElementById("clientAddress").value.trim(),
        ref_paiement: document.getElementById("clientPaymentRef").value.trim(),
        msg: document.getElementById("clientMessage").value.trim()
    };
}

function orderReceipt(infos) {
    const now = new Date();
    const dateString = now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeString = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const timestampCode = now.toISOString().replace(/T/, "_").replace(/:/g, "-").split(".")[0];
    const humanReadableText = `*Nouvelle Commande du ${dateString} à ${timeString}*\n\n👤 Nom: ${infos.nom}\n📧 Email: ${infos.email}\n📞 Contact: ${infos.contact}\n🌍 DESTINATION: ${infos.pays} - ${infos.adresse}\n💳 Réf Paiement: ${infos.ref_paiement}\n\n🛒 Détails:\n${infos.msg}`;
    const jsonObject = {
        date_commande: dateString,
        heure_commande: timeString,
        client: { nom: infos.nom, email: infos.email, telephone: infos.contact },
        livraison: { pays: infos.pays, adresse: infos.adresse },
        paiement: { reference_mobile_money: infos.ref_paiement },
        details_commande: infos.msg
    };
    return { dateString, timeString, timestampCode, humanReadableText, jsonText: JSON.stringify(jsonObject, null, 4) };
}

function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function handleOrderSubmit(event) {
    event.preventDefault();
    const submitter = event.submitter;
    if (!submitter) return;

    const platform = submitter.dataset.platform || "email";
    const socialUrl = submitter.dataset.url || "#";
    const infos = readOrderForm();
    const receipt = orderReceipt(infos);

    const originalLabel = submitter.textContent;
    submitter.disabled = true;
    submitter.textContent = "Enregistrement dans Kobo…";

    // Ouvrir immédiatement une fenêtre vide pour éviter le blocage popup après await.
    const needsPopup = ["whatsapp", "sms", "messenger", "instagram", "linkedin", "glow", "other"].includes(platform);
    const popup = needsPopup ? window.open("about:blank", "_blank") : null;

    try {
        await submitOrderToKobo(infos, platform);
        showStatus("✅ Commande enregistrée avec succès dans KoboToolbox.", "success", false);

        const sellerEmail = CURRENT_SITE_DATA?.about?.email || "";
        const fullMessage = `🕒 Date et Heure d'envoi : ${receipt.dateString} à ${receipt.timeString}\n\n👤 CLIENT: ${infos.nom}\n📧 EMAIL: ${infos.email}\n📞 CONTACT: ${infos.contact}\n🌍 DESTINATION: ${infos.pays} - ${infos.adresse}\n\n💳 RÉFÉRENCE PAIEMENT: ${infos.ref_paiement}\n\n🛒 DÉTAILS:\n${infos.msg}`;
        const mailtoUrl = `mailto:${encodeURIComponent(sellerEmail)}?cc=${encodeURIComponent(infos.email)}&subject=${encodeURIComponent(`Nouvelle Commande (${infos.contact} - De ${infos.pays}) - ${infos.nom}`)}&body=${encodeURIComponent(fullMessage)}`;

        if (platform === "phone") {
            window.location.href = socialUrl;
        } else if (platform === "email") {
            window.location.href = mailtoUrl;
        } else if (platform === "download") {
            downloadBlob(`${receipt.humanReadableText}\n`, "text/plain;charset=utf-8", `Recu_Commande_Boeny_${receipt.timestampCode}.txt`);
        } else if (platform === "download_json") {
            downloadBlob(receipt.jsonText, "application/json;charset=utf-8", `Recu_Commande_Boeny_${receipt.timestampCode}.json`);
        } else {
            let finalUrl = socialUrl;
            const encoded = encodeURIComponent(receipt.humanReadableText);
            if (platform === "whatsapp") finalUrl += (finalUrl.includes("?") ? "&" : "?") + "text=" + encoded;
            if (platform === "sms") finalUrl += (finalUrl.includes("?") ? "&" : "?") + "body=" + encoded;
            if (["messenger", "instagram", "linkedin"].includes(platform) && navigator.clipboard) {
                await navigator.clipboard.writeText(receipt.humanReadableText).catch(() => {});
                alert(CURRENT_SITE_DATA?.system?.socialCopyMessage || "Infos copiées. Collez-les dans le réseau social qui vient de s'ouvrir.");
            }
            if (popup && !popup.closed) popup.location.href = finalUrl;
            else window.location.href = finalUrl;
        }
    } catch (error) {
        if (popup && !popup.closed) popup.close();
        console.error(error);
        showStatus(`❌ Impossible d'enregistrer la commande dans KoboToolbox : ${escapeHtml(error.message)}<br><small>Vérifiez le token, le déploiement du formulaire et les autorisations/CORS.</small>`, "danger", true);
        alert("La commande n'a pas été enregistrée dans KoboToolbox. Aucun envoi externe n'a été déclenché afin d'éviter de perdre la commande.");
    } finally {
        submitter.disabled = false;
        submitter.textContent = originalLabel;
    }
}

/* --------------------------- DÉMARRAGE --------------------------- */

const OBSERVER = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("active"); });
}, { threshold: 0.1 });

async function startBoenyNectar() {
    try {
        if (!tokenIsConfigured()) {
            throw new Error("Le token Kobo n'est pas encore renseigné. Ouvrez script.js et remplacez COLLEZ_ICI_VOTRE_TOKEN_KOBO.");
        }

        showStatus("Connexion à KoboToolbox et chargement du contenu…", "info", true);
        await resolveProjectUids();

        const submissions = await getAllCmsSubmissions();
        const selected = selectPublishedCmsSubmission(submissions);
        const data = await transformCmsSubmission(selected);
        renderSite(data);

        const orderForm = document.getElementById("clientOrderForm");
        orderForm.addEventListener("submit", handleOrderSubmit);

        showStatus(`✅ Site chargé depuis KoboToolbox${data.cmsVersion ? ` — configuration ${escapeHtml(data.cmsVersion)}` : ""}.`, "success", false);
    } catch (error) {
        console.error("Initialisation KoboToolbox :", error);
        showStatus(`❌ ${escapeHtml(error.message)}<br><small>Le site n'utilise aucun fichier data.json local.</small>`, "danger", true);
    }
}

document.addEventListener("DOMContentLoaded", startBoenyNectar);
window.addEventListener("beforeunload", () => OBJECT_URLS.forEach(u => URL.revokeObjectURL(u)));
