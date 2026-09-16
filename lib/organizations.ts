import { RoleName } from '@prisma/client';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'org'
  );
}

/**
 * Creates a new Organization with the fixed Role set for MVP
 * (db-migration-runner's Role model), then a User as its Owner.
 * Called from the sign-up server action — see app/(marketing)/signup/actions.ts.
 */
export async function createOrganizationWithOwner(input: {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}) {
  const baseSlug = slugify(input.organizationName);
  let slug = baseSlug;
  let suffix = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const passwordHash = await hashPassword(input.password);

  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug,
        timezone: 'UTC',
        usageQuota: 5,
        billingCycleStart: new Date(),
      },
    });

    const roles = await Promise.all(
      Object.values(RoleName).map((name) =>
        tx.role.create({
          data: { organizationId: organization.id, name, permissions: {} },
        }),
      ),
    );

    const ownerRole = roles.find((role) => role.name === RoleName.Owner);
    if (!ownerRole) throw new Error('Owner role was not created');

    const user = await tx.user.create({
      data: {
        organizationId: organization.id,
        name: input.name,
        email: input.email,
        passwordHash,
        roleId: ownerRole.id,
        status: 'active',
      },
    });

    return { organization, user };
  });
}
