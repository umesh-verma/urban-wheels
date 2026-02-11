"use server";

import { getUserAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rentalReservations } from "@/lib/db/schema/tables";
import { env } from "@/lib/env";

export type ReservationData = {
  carId: string;
  locationId: string;
  checkIn: Date;
  checkOut: Date;
  carName: string;
  carSlug: string;
  locationName: string;
  pricePerDay: number;
  totalDays: number;
  subtotal: number;
  taxesAndFees: number;
  total: number;
  currency: string;
};

export async function createReservation(data: ReservationData) {
  // Check authentication
  const user = await getUserAuth();

  if (!user) {
    return { error: "You must be logged in to make a reservation" };
  }

  try {
    console.log("Creating reservation:", {
      car_id: data.carId,
      user_id: user.id,
      location_id: data.locationId,
      check_in: data.checkIn,
      check_out: data.checkOut,
    });

    // Create the reservation in the database
    await db.insert(rentalReservations).values({
      car_id: data.carId,
      user_id: user.id,
      location_id: data.locationId,
      check_in: data.checkIn,
      check_out: data.checkOut,
      created_at: new Date(),
    });

    console.log("Reservation created successfully");

    // Generate WhatsApp URL with reservation details
    const whatsappUrl = generateWhatsAppUrl(data, user);
    console.log("WhatsApp URL:", whatsappUrl);

    return { success: true, whatsappUrl };
  } catch (error) {
    console.error("Failed to create reservation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      error: `Failed to create reservation: ${errorMessage}. Please try again.`,
    };
  }
}

function generateWhatsAppUrl(
  data: ReservationData,
  user: { id: string; name?: string | null; email?: string | null }
): string {
  const phoneNumber = env.COMPANY_WHATSAPP_NUMBER.replace(/\D/g, ""); // Remove non-digits

  const message = encodeURIComponent(
    `*New Car Reservation Request* 🚗\n\n` +
      `*Customer Details:*\n` +
      `Name: ${user.name || "N/A"}\n` +
      `Email: ${user.email || "N/A"}\n\n` +
      `*Reservation Details:*\n` +
      `Car: ${data.carName}\n` +
      `Location: ${data.locationName}\n` +
      `Check-in: ${formatDate(data.checkIn)}\n` +
      `Check-out: ${formatDate(data.checkOut)}\n` +
      `Duration: ${data.totalDays} day${data.totalDays > 1 ? "s" : ""}\n\n` +
      `*Pricing:*\n` +
      `Rate: ${formatCurrency(data.pricePerDay, data.currency)}/day\n` +
      `Subtotal: ${formatCurrency(data.subtotal, data.currency)}\n` +
      `Taxes & Fees: ${formatCurrency(data.taxesAndFees, data.currency)}\n` +
      `*Total: ${formatCurrency(data.total, data.currency)}*\n\n` +
      `Please confirm this reservation.`
  );

  return `https://wa.me/${phoneNumber}?text=${message}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
