"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { ReservationData } from "@/lib/actions/reservation";

import { Button } from "@/components/ui/button";
import { createReservation } from "@/lib/actions/reservation";

type PayButtonProps = {
  reservationData: ReservationData;
};

export function PayButton({ reservationData }: PayButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleReserve = async () => {
    setIsLoading(true);
    console.log("Button clicked, sending reservation...", reservationData);

    try {
      const result = await createReservation(reservationData);
      console.log("Server response:", result);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.whatsappUrl) {
        toast.success("Reservation created!", {
          description: "Opening WhatsApp to confirm...",
        });

        // Small delay to show toast before opening
        setTimeout(() => {
          window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
        }, 500);
      } else {
        toast.error("Failed to generate WhatsApp link");
      }
    } catch (err) {
      console.error("Client error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="lg"
      className="w-full text-lg"
      onClick={handleReserve}
      disabled={isLoading}
      type="button"
    >
      {isLoading ? "Processing..." : "Reserve via WhatsApp"}
    </Button>
  );
}
