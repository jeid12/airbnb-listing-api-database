const BRAND = "#FF5A5F";
const BASE = `font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px`;

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">${label}</a>`;
}

export function welcomeEmail(name: string, role: string): string {
  const cta =
    role === "HOST"
      ? `<p>Ready to start earning? Create your first listing and welcome guests from around the world.</p>${btn("#", "Create a Listing")}`
      : `<p>Your next adventure is one click away. Explore thousands of unique listings worldwide.</p>${btn("#", "Browse Listings")}`;

  return `<div style="${BASE}">
    <h1 style="color:${BRAND}">Welcome to Airbnb, ${name}! 🎉</h1>
    <p>We're thrilled to have you on board as a <strong>${role}</strong>.</p>
    ${cta}
    <p style="color:#888;font-size:12px;margin-top:32px">You received this email because you signed up for Airbnb.</p>
  </div>`;
}

export function bookingConfirmationEmail(
  guestName: string,
  listingTitle: string,
  location: string,
  checkIn: string,
  checkOut: string,
  totalPrice: number
): string {
  return `<div style="${BASE}">
    <h1 style="color:${BRAND}">Booking Confirmed! ✅</h1>
    <p>Hi <strong>${guestName}</strong>, your booking is confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Listing</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${listingTitle}</strong></td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Location</td><td style="padding:8px;border-bottom:1px solid #eee">${location}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Check-in</td><td style="padding:8px;border-bottom:1px solid #eee">${checkIn}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Check-out</td><td style="padding:8px;border-bottom:1px solid #eee">${checkOut}</td></tr>
      <tr><td style="padding:8px;color:#888">Total</td><td style="padding:8px"><strong>$${totalPrice.toFixed(2)}</strong></td></tr>
    </table>
    <p style="color:#555;font-size:13px">Cancellation policy: You may cancel up to 24 hours before check-in for a full refund.</p>
    <p style="color:#888;font-size:12px;margin-top:32px">Questions? Contact your host through the app.</p>
  </div>`;
}

export function bookingCancellationEmail(
  guestName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string
): string {
  return `<div style="${BASE}">
    <h1 style="color:${BRAND}">Booking Cancelled</h1>
    <p>Hi <strong>${guestName}</strong>, your booking has been cancelled.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Listing</td><td style="padding:8px;border-bottom:1px solid #eee">${listingTitle}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Check-in</td><td style="padding:8px;border-bottom:1px solid #eee">${checkIn}</td></tr>
      <tr><td style="padding:8px;color:#888">Check-out</td><td style="padding:8px">${checkOut}</td></tr>
    </table>
    <p>Looking for a new place to stay? We have thousands of listings waiting for you.</p>
    ${btn("#", "Browse Listings")}
    <p style="color:#888;font-size:12px;margin-top:32px">Refunds are processed within 5–7 business days.</p>
  </div>`;
}

export function passwordResetEmail(name: string, resetLink: string): string {
  return `<div style="${BASE}">
    <h1 style="color:${BRAND}">Reset Your Password</h1>
    <p>Hi <strong>${name}</strong>, we received a request to reset your password.</p>
    <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
    ${btn(resetLink, "Reset Password")}
    <p style="color:#555;font-size:13px;margin-top:24px">Or copy this link into your browser:<br><a href="${resetLink}" style="color:${BRAND}">${resetLink}</a></p>
    <p style="color:#888;font-size:12px;margin-top:32px">If you did not request this, ignore this email. Your password will not change.</p>
  </div>`;
}
