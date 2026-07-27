import prisma from './src/db';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return;
  console.log(`Uploading test file for user: ${user.id}`);

  const form = new FormData();
  form.append('document', fs.createReadStream('./test-dexa.txt'));

  const response = await fetch(`http://localhost:4000/api/v1/users/${user.id}/documents`, {
    method: 'POST',
    body: form,
  });

  const data = await response.json();
  console.log('Upload Result:', data);
  
  if (data.document && data.document.fileUrl) {
    console.log(`Checking if file exists on disk...`);
    const exists = fs.existsSync(`../${data.document.fileUrl}`);
    console.log(`File Exists: ${exists}`);
  }
}

main().catch(console.error);
