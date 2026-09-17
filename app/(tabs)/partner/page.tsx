import { BadgeCheck, CalendarCheck2, Mail, Phone, ShieldCheck, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Deliberately not a self-service application form — an open public form
// inviting anyone to submit a "new salon" is an easy target for spam/fake
// listings with nothing gating it (decided with the user). This is a
// contact/info page only; a real application form gets built once there's a
// reviewed intake process behind it. The actual salon-creation + Admin
// verification flow (app/owner/salons/new, app/admin/salons) already exists
// and is real — this page is what leads a prospective owner to get in touch
// before that.
const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Reach more customers",
    detail: "Get discovered on Home and Explore by people already searching for a salon nearby.",
  },
  {
    icon: CalendarCheck2,
    title: "Manage bookings online",
    detail: "A real owner dashboard for services, staff, slots, and every booking — no more phone-only scheduling.",
  },
  {
    icon: ShieldCheck,
    title: "Get paid securely",
    detail: "Accept online payments or pay-at-salon, your choice — settlements handled for you.",
  },
  {
    icon: BadgeCheck,
    title: "Verified, trusted badge",
    detail: "Every listed salon is reviewed by our team before it goes live, so customers book with confidence.",
  },
] as const;

const STEPS = [
  { step: "1", title: "Get in touch", detail: "Call or email us with your salon's name and city." },
  { step: "2", title: "We review your business", detail: "Our team verifies your details — this keeps every listing trustworthy." },
  { step: "3", title: "Go live", detail: "Once approved, we help you set up your dashboard and start taking bookings." },
];

const PARTNER_PHONE = "+91 98765 43210";
const PARTNER_EMAIL = "partners@bookmycharm.com";

export default function PartnerPage() {
  return (
    <main className="px-5 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-serif text-3xl font-semibold md:text-5xl">Own a salon? Grow it with Book My Charm.</h1>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Join the salons already taking bookings, payments, and walk-ins through Book My Charm — reach more customers without
          the front-desk chaos.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, detail }) => (
          <Card key={title} className="p-5">
            <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
              <Icon className="size-5 text-primary" strokeWidth={1.5} />
            </span>
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-center font-serif text-2xl font-semibold">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-gradient-to-r from-brass to-brass-bright text-sm font-semibold text-primary-foreground">
                {s.step}
              </span>
              <p className="mt-3 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <Card className="mx-auto mt-16 max-w-2xl p-8 text-center">
        <h2 className="font-serif text-2xl font-semibold">Ready to list your salon?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reach out and we'll walk you through it — there's no online application form, just a quick conversation.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="gap-2 bg-gradient-to-r from-brass to-brass-bright text-primary-foreground hover:opacity-90">
            <a href={`tel:${PARTNER_PHONE.replace(/\s/g, "")}`}>
              <Phone className="size-4" />
              Call {PARTNER_PHONE}
            </a>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <a href={`mailto:${PARTNER_EMAIL}`}>
              <Mail className="size-4" />
              Email us
            </a>
          </Button>
        </div>
      </Card>
    </main>
  );
}
