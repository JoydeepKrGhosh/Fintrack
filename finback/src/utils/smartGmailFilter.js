const otpKeywords = ["otp", "one time password", "use", "do not share"];
const promoKeywords = ["offer", "sale", "discount", "win", "congratulations", "free", "apply", "eligible", "avail", "deal", "loan available", "instantly"];
const codKeywords = ["cash on delivery", "cod", "will be collected", "pay on delivery"];
const productShippedKeywords = ["shipped", "delivered", "tracking", "out for delivery"];

function shouldIncludeGmail(msg) {
    msg = msg.toLowerCase().replace(/\n/g, ' ');

    if (otpKeywords.some(k => msg.includes(k))) return false;
    if (promoKeywords.some(k => msg.includes(k)) && !(msg.includes("debited") || msg.includes("credited"))) return false;
    if (codKeywords.some(k => msg.includes(k))) return false;
    if (productShippedKeywords.some(k => msg.includes(k))) return false;

    if ((msg.includes("debited") || msg.includes("credited")) &&
        (msg.includes("₹") || msg.includes("rs") || msg.includes("inr"))) return true;

    if ((msg.includes("emi") || msg.includes("loan")) &&
        (msg.includes("debited") || msg.includes("auto-debited"))) return true;

    return false;
}

module.exports = { shouldIncludeGmail };
