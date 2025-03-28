import { SubscriptionType } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { prisma } from '@/lib/prisma'
import { auth } from '@/http/middlewares/auth'
import { BadRequestError } from '@/http/_errors/bad-request-error'

export async function getProfile(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/profile',
      {
        schema: {
          tags: ['Auth'],
          summary: 'Authenticate with e-mail & password',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              user: z.object({
                id: z.string().uuid(),
                name: z.string().nullable(),
                email: z.string().email(),
                avatarUrl: z.string().url().nullable(),
                owns_organizations: z.array(
                  z.object({
                    Subscription: z.array(
                      z.object({
                        plan: z.object({
                          type: z.nativeEnum(SubscriptionType),
                        }),
                      })
                    ),
                  })
                ),
              }),
            }),
          }
        },
      },

      async (request, reply) => {
        const userId = await request.getCurrentUserId()

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              owns_organizations: {
                select: {
                  Subscription: {
                    select: {
                      plan: {
                        select: {
                          type: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })


        if (!user) {
          throw new BadRequestError('User not found.')
        }

        return reply.send({ user })
      },
    )
}
