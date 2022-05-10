import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  // const email = "rachel@remix.run";

  // const hashedPassword = await bcrypt.hash("racheliscool", 10);

  // await prisma.user.delete({ where: { email } }).catch(() => {
  //   // no worries if it doesn't exist yet
  // });

  // await prisma.itemParent.deleteMany({}).catch(() => {});
  // await prisma.item.deleteMany({}).catch(() => {});

  // await prisma.user.create({
  //   data: {
  //     email,
  //     password: {
  //       create: {
  //         hash: hashedPassword,
  //       },
  //     },
  //     isAdmin: false,
  //   },
  // });

  // const generateRandom = () => Math.floor(Math.random() * 6) + 2;

  // const createdItemParentsPromise = Array.from({
  //   length: generateRandom(),
  // }).map((_, id) => {
  //   return prisma.itemParent.create({
  //     data: {
  //       name: `Kamera model #${id + 1}`,
  //       desc: `Super kamera do krecenia #${id + 1} filmow`,
  //       quantity: generateRandom(),
  //     },
  //   });
  // });

  // const createdItemParents = await Promise.all(createdItemParentsPromise);

  // const createdItemsPromise = createdItemParents.map(({ quantity, id }) =>
  //   Array.from({ length: quantity }).map(() =>
  //     Promise.resolve(
  //       prisma.item.create({
  //         data: {
  //           parentId: id,
  //         },
  //       })
  //     )
  //   )
  // );

  // await Promise.all(createdItemsPromise);

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
