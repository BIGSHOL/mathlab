import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const ids = [
  'cmn64ldtj003fuf7sxblgkme2','cmn64lm72008ruf7s6m1ajv67','cmn64laid0015uf7soxlf9jiv',
  'cmn64l8za0001uf7shmy0q7u8','cmn64l91p0003uf7s3e9airuy','cmn64ljbz006zuf7stas7va11',
  'cmn64le26003luf7s0idf3wrt','cmn64ldmn003buf7sr4ilkv89','cmn64ldvg003huf7s62p1zfjs',
  'cmn64ln81009juf7s93fex4r3'
];
async function main() {
  const cs = await p.concept.findMany({where:{id:{in:ids}},select:{id:true,title:true,fullContent:true,conceptCode:true}});
  for(const c of cs) {
    console.log(`\n=== ${c.conceptCode} | ${c.title} ===`);
    console.log(c.fullContent);
  }
}
main().then(()=>p.$disconnect());
