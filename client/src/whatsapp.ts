const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function isMobileDevice() {
  const navigatorWithData = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return navigatorWithData.userAgentData?.mobile === true || mobilePattern.test(navigator.userAgent);
}

export function normalizeWhatsAppPhone(value: string | null | undefined) {
  let phone = String(value ?? "").replace(/\D/g, "");
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("0")) phone = `595${phone.slice(1)}`;
  else if (!phone.startsWith("595") && phone.length === 9) phone = `595${phone}`;
  return phone;
}

export function openWhatsApp(
  phoneValue: string | null | undefined,
  message: string,
  popup?: Window | null,
) {
  const phone = normalizeWhatsAppPhone(phoneValue);
  if (phone.length < 11) {
    popup?.close();
    return false;
  }

  const text = encodeURIComponent(message);
  const webUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${text}`;
  const fallbackUrl = `https://wa.me/${phone}?text=${text}`;

  if (!isMobileDevice()) {
    if (popup) popup.location.href = webUrl;
    else window.open(webUrl, "_blank");
    return true;
  }

  const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
  const target = popup ?? window.open("about:blank", "_blank");
  if (target) target.location.href = appUrl;
  else window.location.href = appUrl;

  const fallbackTimer = window.setTimeout(() => {
    if (document.visibilityState !== "visible") return;
    try {
      if (target && !target.closed) target.location.href = fallbackUrl;
      else window.location.href = fallbackUrl;
    } catch {
      window.location.href = fallbackUrl;
    }
  }, 1600);
  const stopFallback = () => {
    if (document.visibilityState === "hidden") {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", stopFallback);
    }
  };
  document.addEventListener("visibilitychange", stopFallback);
  return true;
}
