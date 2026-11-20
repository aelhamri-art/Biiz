import { describe, expect, it } from "vitest";
import {
  computeFunnel,
  computeMetric,
  type BiEvent,
  type Period,
} from "@/lib/bi-data";

const period: Period = { from: "2026-11-01", to: "2026-11-30" };

let seq = 0;
function event(
  event_name: string,
  at: string,
  overrides: Partial<BiEvent> = {},
): BiEvent {
  seq += 1;
  return {
    id: `evt-${seq}`,
    workspace_id: "ws-alpha",
    source_id: "src-alpha",
    event_name,
    occurred_at: at,
    received_at: at,
    external_event_id: `external-${seq}`,
    customer_external_id: "customer-1",
    booking_external_id: "booking-1",
    location_external_id: "location-1",
    employee_external_id: null,
    service_external_id: null,
    session_id: null,
    utm_source: "google",
    utm_medium: "organic",
    utm_campaign: null,
    utm_content: null,
    capability: "barber",
    revenue_cents: null,
    currency: null,
    metadata: {},
    ...overrides,
  };
}

describe("BIIZ semantic layer", () => {
  it("returns null instead of fake zero when no booking is instrumented", () => {
    const bookings = computeMetric([], period, "bookings");
    const noShow = computeMetric([], period, "no_show_rate");

    expect(bookings.value).toBeNull();
    expect(bookings.reason).toBeTruthy();
    expect(noShow.value).toBeNull();
  });

  it("nets a reverted no-show and only counts the active final business state", () => {
    const events: BiEvent[] = [
      event("booking_completed", "2026-11-02T09:00:00Z", { booking_external_id: "b1", customer_external_id: "c1", revenue_cents: 2500, currency: "EUR" }),
      event("booking_no_show", "2026-11-03T09:00:00Z", { booking_external_id: "b1", customer_external_id: "c1" }),
      event("booking_no_show_reverted", "2026-11-03T09:05:00Z", { booking_external_id: "b1", customer_external_id: "c1" }),
      event("booking_completed", "2026-11-04T09:00:00Z", { booking_external_id: "b2", customer_external_id: "c2", revenue_cents: 3000, currency: "EUR" }),
      event("booking_no_show", "2026-11-05T09:00:00Z", { booking_external_id: "b2", customer_external_id: "c2" }),
    ];

    expect(computeMetric(events, period, "no_show_count").value).toBe(1);
    expect(computeMetric(events, period, "no_show_rate").value).toBe(50);
  });

  it("does not count a no-show later cancelled", () => {
    const events: BiEvent[] = [
      event("booking_completed", "2026-11-06T09:00:00Z", { booking_external_id: "b3", customer_external_id: "c3", revenue_cents: 2500, currency: "EUR" }),
      event("booking_no_show", "2026-11-07T09:00:00Z", { booking_external_id: "b3", customer_external_id: "c3" }),
      event("booking_cancelled", "2026-11-07T09:10:00Z", { booking_external_id: "b3", customer_external_id: "c3" }),
    ];

    expect(computeMetric(events, period, "no_show_count").value).toBe(0);
    expect(computeMetric(events, period, "no_show_rate").value).toBe(0);
  });

  it("does not mix pre-instrumentation historical bookings into conversion", () => {
    const events: BiEvent[] = [
      event("booking_completed", "2026-11-02T09:00:00Z", {
        capability: "barber",
        booking_external_id: "historical",
        customer_external_id: "historical-customer",
        revenue_cents: 2500,
        currency: "EUR",
      }),
      event("barber_page_viewed", "2026-11-20T10:00:00Z", {
        capability: "barber",
        session_id: "session-a",
        booking_external_id: null,
        customer_external_id: null,
      }),
      event("barber_page_viewed", "2026-11-20T11:00:00Z", {
        capability: "barber",
        session_id: "session-b",
        booking_external_id: null,
        customer_external_id: null,
      }),
      event("booking_completed", "2026-11-20T10:05:00Z", {
        capability: "barber",
        booking_external_id: "new-booking",
        customer_external_id: "new-customer",
        revenue_cents: 3000,
        currency: "EUR",
      }),
    ];

    expect(computeMetric(events, period, "conversion_rate").value).toBe(50);
    const funnel = computeFunnel(events, "barber", period);
    expect(funnel.find((row) => row.event === "booking_completed")?.count).toBe(1);
  });

  it("counts funnel reach by unique session instead of raw clicks", () => {
    const events: BiEvent[] = [
      event("wash_page_viewed", "2026-11-09T10:00:00Z", { capability: "wash", session_id: "session-a", booking_external_id: null, customer_external_id: null }),
      event("wash_booking_started", "2026-11-09T10:01:00Z", { capability: "wash", session_id: "session-a", booking_external_id: null, customer_external_id: null }),
      event("wash_slot_selected", "2026-11-09T10:02:00Z", { capability: "wash", session_id: "session-a", booking_external_id: null, customer_external_id: null }),
      event("wash_slot_selected", "2026-11-09T10:03:00Z", { capability: "wash", session_id: "session-a", booking_external_id: null, customer_external_id: null }),
      event("wash_page_viewed", "2026-11-09T11:00:00Z", { capability: "wash", session_id: "session-b", booking_external_id: null, customer_external_id: null }),
    ];

    const funnel = computeFunnel(events, "wash", period);
    expect(funnel.find((row) => row.event === "wash_page_viewed")?.count).toBe(2);
    expect(funnel.find((row) => row.event === "wash_booking_started")?.count).toBe(1);
    expect(funnel.find((row) => row.event === "wash_slot_selected")?.count).toBe(1);
  });

  it("keeps the Wash funnel separate and marks uninstrumented steps as null", () => {
    const events: BiEvent[] = [
      event("wash_page_viewed", "2026-11-10T10:00:00Z", { capability: "wash", booking_external_id: null, customer_external_id: null, revenue_cents: null }),
      event("wash_booking_started", "2026-11-10T10:01:00Z", { capability: "wash", booking_external_id: null, customer_external_id: null, revenue_cents: null }),
      event("wash_booking_completed", "2026-11-10T10:05:00Z", { capability: "wash", booking_external_id: "wash-1", customer_external_id: "c1", revenue_cents: 5400, currency: "EUR" }),
    ];

    const funnel = computeFunnel(events, "wash");
    expect(funnel.find((row) => row.event === "wash_page_viewed")?.count).toBe(1);
    expect(funnel.find((row) => row.event === "wash_booking_started")?.count).toBe(1);
    expect(funnel.find((row) => row.event === "wash_vehicle_selected")?.count).toBeNull();
    expect(funnel.find((row) => row.event === "wash_booking_completed")?.count).toBe(1);
  });

  it("calculates Barber ↔ Wash cross-sell from the same customer identity", () => {
    const events: BiEvent[] = [
      event("booking_completed", "2026-11-11T09:00:00Z", { booking_external_id: "barber-1", customer_external_id: "customer-cross", capability: "barber", revenue_cents: 2500, currency: "EUR" }),
      event("wash_booking_completed", "2026-11-12T09:00:00Z", { booking_external_id: "wash-1", customer_external_id: "customer-cross", capability: "wash", revenue_cents: 5400, currency: "EUR" }),
    ];

    expect(computeMetric(events, period, "cross_sell_rate").value).toBe(100);
  });

  it("separates booked revenue from realized revenue", () => {
    const events: BiEvent[] = [
      event("booking_completed", "2026-11-13T09:00:00Z", { booking_external_id: "rev-1", revenue_cents: 3000, currency: "EUR" }),
      event("booking_service_completed", "2026-11-13T09:30:00Z", { booking_external_id: "rev-1", revenue_cents: 3000, currency: "EUR" }),
      event("booking_completed", "2026-11-14T09:00:00Z", { booking_external_id: "rev-2", revenue_cents: 2500, currency: "EUR" }),
    ];

    expect(computeMetric(events, period, "booked_revenue").value).toBe(55);
    expect(computeMetric(events, period, "realized_revenue").value).toBe(30);
  });
});
