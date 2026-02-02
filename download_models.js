const fs = require('fs');
const https = require('https');
const path = require('path');

const models = [
    { name: 'Xbot.glb', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb' },
    { name: 'Ybot.glb', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Ybot.glb' },
    { name: 'male_base.glb', url: 'https://raw.githubusercontent.com/Siddu7077/3D-model/main/rbb.glb' },
    { name: 'female_base.glb', url: 'https://raw.githubusercontent.com/hmthanh/3d-human-model/main/TranThiNgocTham.glb' }
];

const downloadDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(downloadDir)){
    fs.mkdirSync(downloadDir, { recursive: true });
}

models.forEach(model => {
    const file = fs.createWriteStream(path.join(downloadDir, model.name));
    https.get(model.url, function(response) {
        if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${model.name}`);
            });
        } else if (response.statusCode === 302 || response.statusCode === 301) {
             // Handle redirect if needed, but raw.github usually works or returns 200
             console.log(`Redirect for ${model.name} to ${response.headers.location}`);
             https.get(response.headers.location, function(redirectResponse) {
                redirectResponse.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`Downloaded ${model.name} (after redirect)`);
                });
             });
        } else {
            console.error(`Failed to download ${model.name}: ${response.statusCode}`);
            file.close();
            fs.unlinkSync(path.join(downloadDir, model.name));
        }
    }).on('error', function(err) {
        fs.unlinkSync(path.join(downloadDir, model.name));
        console.error(`Error downloading ${model.name}: ${err.message}`);
    });
});
