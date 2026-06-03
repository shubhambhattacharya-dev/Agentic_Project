// src/routes/webhook.routes.ts
import express, { Request, Response } from "express";
import { Webhook } from "svix";
import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

const route = express.Router();

// Clerk webhook endpoint — syncs users to database
route.post("/clerk-webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    logger.error("CLERK_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // Get headers
  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(400).json({ error: "Missing svix headers" });
    return;
  }

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: { type: string; data: Record<string, unknown> };

  try {
    evt = wh.verify(typeof req.body === 'string' ? req.body : req.body.toString(), {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as { type: string; data: Record<string, unknown> };
  } catch (err) {
    logger.error(err, "Webhook verification failed");
    res.status(400).json({ error: "Webhook verification failed" });
    return;
  }

  const { type, data } = evt;
  logger.info(`Clerk webhook received: ${type}`);

  try {
    switch (type) {
      case "user.created": {
        const email = data.email_addresses && Array.isArray(data.email_addresses)
          ? (data.email_addresses[0] as { email_address?: string })?.email_address ?? ""
          : "";
        const name = `${(data.first_name as string) || ""} ${(data.last_name as string) || ""}`.trim() || "Customer";
        const clerkUserId = data.id as string;

        if (!email) {
          logger.warn("User created webhook missing email");
          break;
        }

        // Check if customer already exists
        const existing = await prisma.customer.findUnique({
          where: { email },
        });

        if (existing) {
          // Update clerkId if not set
          if (!existing.clerkId) {
            await prisma.customer.update({
              where: { id: existing.id },
              data: { clerkId: clerkUserId },
            });
            logger.info(`Updated clerkId for existing customer: ${email}`);
          }
        } else {
          // Create new customer
          await prisma.customer.create({
            data: {
              clerkId: clerkUserId,
              email,
              name,
              role: "CUSTOMER",
            },
          });
          logger.info(`New customer created from Clerk: ${email}`);
        }
        break;
      }

      case "user.updated": {
        const email = data.email_addresses && Array.isArray(data.email_addresses)
          ? (data.email_addresses[0] as { email_address?: string })?.email_address ?? ""
          : "";
        const name = `${(data.first_name as string) || ""} ${(data.last_name as string) || ""}`.trim();
        const clerkUserId = data.id as string;

        if (email) {
          await prisma.customer.updateMany({
            where: { clerkId: clerkUserId },
            data: { name: name || undefined },
          });
          logger.info(`Customer updated from Clerk: ${email}`);
        }
        break;
      }

      case "user.deleted": {
        const clerkUserId = data.id as string;
        // Don't delete customer — just remove clerkId
        await prisma.customer.updateMany({
          where: { clerkId: clerkUserId },
          data: { clerkId: null },
        });
        logger.info(`Clerk user deleted, clerkId removed: ${clerkUserId}`);
        break;
      }

      default:
        logger.info(`Unhandled webhook type: ${type}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(error, `Webhook handler error for type: ${type}`);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

export default route;

