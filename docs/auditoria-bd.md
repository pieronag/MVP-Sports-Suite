# Auditoría de la base de datos

Generado: 2026-10-11T23:18:32.165Z · muestra de hasta 500 documentos por colección.

"Uso en código" busca el nombre del campo en mvp-sports-web, mvp-sports-app y mvp-sports-backend. Un campo sin uso es candidato a eliminar; uno en pocos documentos suele ser un resto de versiones anteriores.

## Candidatos a eliminar (6)

- `bookings.seriesOf`
- `payments.authorizationCode`
- `settings.primaryColor`
- `tenants.isTransbankActive`
- `users.interests`
- `users.lastCalculation`

## audit

93 documentos (muestra 93).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `traceId` | 100% | string | sí |
| `action` | 100% | string | sí |
| `module` | 100% | string | sí |
| `details` | 100% | string | sí |
| `severity` | 100% | string | sí |
| `status` | 100% | string | sí |
| `actor` | 100% | string | sí |
| `role` | 100% | string | sí |
| `email` | 100% | string | sí |
| `ip` | 100% | string | sí |
| `location` | 100% | string | sí |
| `device` | 100% | string | sí |
| `dateStr` | 100% | string | sí |
| `timeStr` | 100% | string | sí |
| `timestamp` | 100% | timestamp | sí |

## bookings

18 documentos (muestra 18).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `tenantId` | 100% | string | sí |
| `tenantName` | 100% | string | sí |
| `courtId` | 100% | string | sí |
| `courtName` | 100% | string | sí |
| `sport` | 100% | string | sí |
| `clientName` | 100% | string | sí |
| `clientPhone` | 100% | string | sí |
| `date` | 100% | timestamp | sí |
| `startTime` | 100% | string | sí |
| `endTime` | 100% | string | sí |
| `totalPrice` | 100% | number | sí |
| `paymentStatus` | 100% | string | sí |
| `paymentMethod` | 100% | string | sí |
| `source` | 100% | string | sí |
| `createdAt` (type, seconds, nanoseconds) | 100% | timestamp, map | sí |
| `createdBy` | 100% | string | sí |
| `status` | 100% | string | sí |
| `cancelledAt` | 78% | timestamp | sí |
| `cancelledBy` | 78% | string | sí |
| `price` | 67% | number | sí |
| `userId` | 67% | string | sí |
| `originalPrice` | 67% | number | sí |
| `couponCode` | 61% | null | sí |
| `discountApplied` | 61% | number | sí |
| `updatedAt` | 39% | timestamp | sí |
| `duration` | 33% | number | sí |
| `deposit` | 33% | number | sí |
| `remainingBalance` | 33% | number | sí |
| `notes` | 33% | string | sí |
| `ownerId` | 33% | string | sí |
| `cancelledByUser` | 28% | string | sí |
| `checkIn` | 6% | boolean | sí |
| `checkInTime` | 6% | timestamp | sí |
| `id` | 6% | string | sí |
| `seriesOf` | 6% | string | **no** |

## challenges

10 documentos (muestra 10).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `type` | 100% | string | sí |
| `sport` | 100% | string | sí |
| `senderId` | 100% | string | sí |
| `receiverId` | 100% | string | sí |
| `createdAt` | 100% | timestamp | sí |
| `status` | 100% | string | sí |
| `updatedAt` | 100% | timestamp | sí |
| `challengerTeamId` | 80% | string | sí |
| `challengerTeamName` | 80% | string | sí |
| `challengedTeamId` | 80% | string | sí |
| `challengedTeamName` | 80% | string | sí |
| `captainId` | 20% | string | sí |
| `captainName` | 20% | string | sí |
| `playerId` | 20% | string | sí |
| `playerName` | 20% | string | sí |

## court_slots

5 documentos (muestra 5).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `courtId` | 100% | string | sí |
| `tenantId` | 100% | null, string | sí |
| `day` | 100% | string | sí |
| `taken` (13:00) | 100% | map | sí |
| `updatedAt` | 100% | timestamp | sí |

## courts

10 documentos (muestra 10).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `tenantId` | 100% | string | sí |
| `name` | 100% | string | sí |
| `surface` | 100% | string | sí |
| `status` | 100% | string | sí |
| `createdAt` | 100% | timestamp | sí |
| `features` | 100% | array | sí |
| `sport` | 100% | string | sí |
| `maintenanceUntil` | 20% | null | sí |
| `maintenanceStart` | 20% | null | sí |

## invoices

1 documentos (muestra 1).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `tenantId` | 100% | string | sí |
| `tenantName` | 100% | string | sí |
| `ownerName` | 100% | string | sí |
| `ownerEmail` | 100% | string | sí |
| `amount` | 100% | number | sí |
| `status` | 100% | string | sí |
| `rawDate` | 100% | string | sí |
| `dueDate` | 100% | timestamp | sí |
| `details` | 100% | string | sí |
| `breakdown` (planName, planCost, commissionRate, commissionTotal, totalBookings, totalRevenue) | 100% | map | sí |
| `issueDate` | 100% | timestamp | sí |

## matchmaking

13 documentos (muestra 13).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `type` | 100% | string | sí |
| `userId` | 100% | string | sí |
| `status` | 100% | string | sí |
| `createdAt` | 100% | timestamp | sí |
| `sport` | 69% | string | sí |
| `teamId` | 62% | string | sí |
| `teamName` | 62% | string | sí |
| `memberCount` | 62% | number | sí |
| `description` | 62% | string | sí |
| `region` | 46% | string | sí |
| `displayName` | 38% | string | sí |
| `photoURL` | 38% | string | sí |
| `communes` | 38% | array | sí |
| `teamImageUrl` | 38% | string | sí |
| `position` | 31% | string | sí |
| `ovr` | 31% | number | sí |
| `tier` | 31% | string | sí |
| `sports` | 31% | array | sí |
| `city` | 15% | string | sí |
| `bookingId` | 8% | string | sí |
| `tenantName` | 8% | string | sí |
| `courtName` | 8% | string | sí |
| `day` | 8% | string | sí |
| `startTime` | 8% | string | sí |
| `needed` | 8% | number | sí |

## payments

34 documentos (muestra 34).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `bookingId` | 100% | string, null | sí |
| `amount` | 100% | number | sí |
| `buyOrder` | 100% | string | sí |
| `status` | 100% | string | sí |
| `method` | 100% | string | sí |
| `createdAt` | 100% | timestamp | sí |
| `tenantId` | 97% | string | sí |
| `pendingBookingData` (userId, tenantId, tenantName, courtId, courtName, clientName, clientPhone, date) | 97% | map, null | sí |
| `returnUrl` | 76% | string, null | sí |
| `token` | 71% | string | sí |
| `userId` | 59% | string | sí |
| `currency` | 26% | string | sí |
| `pendingRegistration` | 26% | null | sí |
| `pendingEnrollment` | 26% | null | sí |
| `kind` | 26% | string | sí |
| `error` | 24% | string | sí |
| `updatedAt` | 24% | timestamp | sí |
| `result` (vci, amount, status, buy_order, session_id, card_detail, accounting_date, transaction_date) | 6% | map | sí |
| `preferenceId` | 3% | string | sí |
| `authorizationCode` | 3% | string | **no** |

## public_profiles

18 documentos (muestra 18).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `photoURL` | 100% | string | sí |
| `uid` | 100% | string | sí |
| `sports` | 100% | array | sí |
| `tier` | 100% | string | sí |
| `city` | 100% | string | sí |
| `displayName` | 100% | string | sí |
| `ovr` | 100% | number | sí |
| `position` | 100% | string | sí |
| `updatedAt` | 100% | timestamp | sí |

## rate_limits

18 documentos (muestra 18).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `hits` | 61% | array | sí |
| `updatedAt` | 61% | number | sí |
| `key` | 39% | string | sí |
| `userId` | 39% | string | sí |
| `functionName` | 39% | string | sí |
| `createdAt` | 39% | timestamp | sí |

## reports

2 documentos (muestra 2).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `subject` | 100% | string | sí |
| `category` | 100% | string | sí |
| `priority` | 100% | string | sí |
| `screen` | 100% | string | sí |
| `description` | 100% | string | sí |
| `stepsToReproduce` | 100% | string | sí |
| `userId` | 100% | string | sí |
| `userEmail` | 100% | string | sí |
| `userName` | 100% | string | sí |
| `userRole` | 100% | string | sí |
| `tenantId` | 100% | string | sí |
| `tenantName` | 100% | string | sí |
| `userAgent` | 100% | string | sí |
| `browser` | 100% | string | sí |
| `os` | 100% | string | sí |
| `screenResolution` | 100% | string | sí |
| `windowSize` | 100% | string | sí |
| `originUrl` | 100% | string | sí |
| `device` | 100% | string | sí |
| `sla` | 100% | number | sí |
| `createdAt` | 100% | timestamp | sí |
| `status` | 100% | string | sí |
| `repliedAt` | 50% | timestamp | sí |
| `response` | 50% | string | sí |
| `repliedBy` | 50% | string | sí |

## settings

3 documentos (muestra 3).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `fromEmail` | 33% | string | sí |
| `xpPerCheckin` | 33% | number | sí |
| `xpPerMatch` | 33% | number | sí |
| `xpPerWin` | 33% | number | sí |
| `xpPerMvp` | 33% | number | sí |
| `tiers` (bronze, silver, gold, diamond, elite, platinum, legend) | 33% | map | sí |
| `xpPerNoShow` | 33% | number | sí |
| `xpPerLoss` | 33% | number | sí |
| `platformName` | 33% | string | sí |
| `primaryColor` | 33% | string | **no** |
| `legal` (terms, privacy) | 33% | map | sí |
| `commissionRate` | 33% | number | sí |
| `social` (instagram, facebook, whatsapp) | 33% | map | sí |
| `maintenanceMode` | 33% | boolean | sí |
| `sii` (rutEmpresa, taxRate, enabled, testMode, enableForTenants) | 33% | map | sí |
| `supportEmail` | 33% | string | sí |
| `corporateData` (representante, emailFacturacion, direccion, giro, rut, razonSocial) | 33% | map | sí |
| `gamification` (winPoints, drawPoints, lossPoints, multiplierSuperior, bronzeThreshold, silverThreshold, goldThreshold, eliteThreshold) | 33% | map | sí |
| `badges` | 33% | map | sí |
| `plans` | 33% | array | sí |
| `paymentGateways` (stripe, webpay, mercadoPago) | 33% | map | sí |
| `updatedAt` | 33% | timestamp | sí |

## settings_private

1 documentos (muestra 1).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `resendApiKey` | 100% | string | sí |
| `fromEmail` | 100% | string | sí |

## staff

1 documentos (muestra 1).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `fullName` | 100% | string | sí |
| `rut` | 100% | string | sí |
| `jobTitle` | 100% | string | sí |
| `email` | 100% | string | sí |
| `phone` | 100% | string | sí |
| `role` | 100% | string | sí |
| `status` | 100% | string | sí |
| `tenantIds` | 100% | array | sí |
| `tenantId` | 100% | string | sí |
| `uid` | 100% | string | sí |
| `createdAt` | 100% | timestamp | sí |

## teams

4 documentos (muestra 4).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `name` | 100% | string | sí |
| `sport` | 100% | string | sí |
| `ownerId` | 100% | string | sí |
| `inviteCode` | 100% | string | sí |
| `createdAt` | 100% | timestamp | sí |
| `members` | 100% | array | sí |
| `elo` | 75% | number | sí |
| `winRate` | 75% | number | sí |
| `trophies` | 75% | number | sí |
| `joinRequests` | 75% | array | sí |
| `imageUrl` | 50% | string | sí |
| `updatedAt` | 25% | timestamp | sí |
| `lastMessageAt` | 25% | string | sí |

## teams/{id}/messages

13 documentos (muestra 13).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `senderId` | 100% | string | sí |
| `senderName` | 100% | string | sí |
| `text` | 100% | string | sí |
| `createdAt` | 100% | timestamp | sí |
| `senderPhoto` | 69% | string | sí |

## tenant_secrets

1 documentos (muestra 1).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `updatedBy` | 100% | string | sí |
| `mercadopagoAccessToken` | 100% | string | sí |
| `updatedAt` | 100% | timestamp | sí |

## tenants

1 documentos (muestra 1).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `name` | 100% | string | sí |
| `ownerIds` | 100% | array | sí |
| `ownerNames` | 100% | array | sí |
| `ownerEmails` | 100% | array | sí |
| `ownerId` | 100% | string | sí |
| `ownerName` | 100% | string | sí |
| `ownerEmail` | 100% | string | sí |
| `region` | 100% | string | sí |
| `coordinates` (lat, lng) | 100% | map | sí |
| `imageUrl` | 100% | string | sí |
| `debtStatus` | 100% | string | sí |
| `createdAt` | 100% | timestamp | sí |
| `totalFeedbacks` | 100% | number | sí |
| `rating` | 100% | number | sí |
| `plan` | 100% | string | sí |
| `gallery` | 100% | array | sí |
| `openTime` | 100% | string | sí |
| `whatsapp` | 100% | string | sí |
| `website` | 100% | string | sí |
| `contactEmail` | 100% | string | sí |
| `description` | 100% | string | sí |
| `instagram` | 100% | string | sí |
| `siiRut` | 100% | string | sí |
| `legalName` | 100% | string | sí |
| `rut` | 100% | string | sí |
| `legalRepresentative` | 100% | string | sí |
| `phone` | 100% | string | sí |
| `isSiiActive` | 100% | boolean | sí |
| `businessType` | 100% | string | sí |
| `cancellationPolicy` | 100% | string | sí |
| `activeSports` | 100% | array | sí |
| `address` | 100% | string | sí |
| `commune` | 100% | string | sí |
| `fullAddress` | 100% | string | sí |
| `schedule` (monday, tuesday, wednesday, thursday, friday, saturday, sunday) | 100% | map | sí |
| `closeTime` | 100% | string | sí |
| `openingHours` | 100% | string | sí |
| `rules` | 100% | array | sí |
| `isTransbankActive` | 100% | boolean | **no** |
| `transbankCommerceCode` | 100% | string | sí |
| `status` | 100% | string | sí |
| `features` (api, topPosition, support, ads, seo, analytics, multiRecinto, marketing) | 100% | map | sí |
| `commission` | 100% | number | sí |
| `siiEnabled` | 100% | boolean | sí |
| `planPrice` | 100% | number | sí |
| `priorityScore` | 100% | number | sí |
| `availableGateways` (stripe, webpay, mercadoPago) | 100% | map | sí |
| `imageURL` | 100% | string | sí |
| `pricing` (Pádel, Futbolito, Padel) | 100% | map | sí |
| `amenities` | 100% | array | sí |
| `isMercadopagoActive` | 100% | boolean | sí |
| `mercadopagoPublicKey` | 100% | string | sí |
| `pendingPlanPrice` | 100% | null | sí |
| `pendingPlanName` | 100% | null | sí |
| `scheduledChangeDate` | 100% | null | sí |
| `pendingPlanId` | 100% | null | sí |
| `pendingBillingCycle` | 100% | null | sí |

## users

21 documentos (muestra 21).

| Campo | % docs | Tipos | Uso en código |
|---|---|---|---|
| `email` | 100% | string | sí |
| `displayName` | 100% | string | sí |
| `role` | 100% | string | sí |
| `createdAt` | 95% | string, timestamp | sí |
| `uid` | 90% | string | sí |
| `tier` | 90% | string | sí |
| `badges` | 90% | array | sí |
| `badgeXpBonus` | 90% | number | sí |
| `stats` (assists, played, lost, morning_matches, night_matches, mvp, sports_played, clean_sheets) | 90% | map | sí |
| `xp` | 90% | number | sí |
| `ovr` | 90% | number | sí |
| `rut` | 86% | string | sí |
| `phone` | 86% | string | sí |
| `lastBulkSync` | 86% | string | sí |
| `city` | 81% | string | sí |
| `mainSport` | 81% | string | sí |
| `position` | 81% | string | sí |
| `dominantFoot` | 81% | string | sí |
| `gender` | 81% | string | sí |
| `favTime` | 81% | string | sí |
| `frequency` | 81% | string | sí |
| `birthDate` | 81% | string | sí |
| `status` | 76% | string | sí |
| `height` | 71% | number, string | sí |
| `weight` | 71% | number, string | sí |
| `lastELOUpdate` | 62% | string | sí |
| `level` | 57% | number, string | sí |
| `rating` | 52% | number | sí |
| `photoURL` | 52% | string | sí |
| `intensity` | 33% | string | sí |
| `bio` | 33% | string | sí |
| `updatedAt` | 33% | string | sí |
| `lastLogin` | 29% | string | sí |
| `companyName` | 24% | string | sí |
| `jobTitle` | 24% | string | sí |
| `favSports` | 24% | array | sí |
| `privacyMode` | 24% | boolean | sí |
| `timezone` | 19% | string | sí |
| `language` | 19% | string | sí |
| `notificationsEnabled` | 19% | boolean | sí |
| `readReceipts` (asNCCbc3ZJOyVEilRFnn) | 10% | map | sí |
| `fullName` | 10% | string | sí |
| `lastStrikeAt` | 5% | timestamp | sí |
| `strikes` | 5% | number | sí |
| `lastStatsUpdate` | 5% | string | sí |
| `billingAddress` | 5% | string | sí |
| `paymentHistory` | 5% | array | sí |
| `tenantIds` | 5% | array | sí |
| `tenantId` | 5% | string | sí |
| `interests` | 5% | array | **no** |
| `form` | 5% | array | sí |
| `sportRatings` (futbol, padel, basketball) | 5% | map | sí |
| `lastCalculation` | 5% | string | **no** |
| `lastSync` | 5% | string | sí |
| `walletUpdatedAt` | 5% | timestamp | sí |
| `walletBalance` | 5% | number | sí |
| `totalXp` | 5% | number | sí |
| `emailVerified` | 5% | boolean | sí |

