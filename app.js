const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const requestIp = require('request-ip');
const app = express();
const port = 3000;

app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(requestIp.mw());

app.get('/.well-known/com.apple.remotemanagement', (req, res) => {
    const ip = req.clientIp;
    fs.readFile('data.json', 'utf-8', (err, data) => {
        if (err) {
            // TODO present Mosyle as default MDM for all users.
            return res.status(500).json({ error: 'Error reading data.json' });
        }

        const jsonData = JSON.parse(data);

        if (jsonData[ip]) {
            res.json({ Servers: [{ Version: jsonData[ip].Version, BaseURL: jsonData[ip].url}] });
        } else {
            res.status(404).json({ error: 'IP not found in data.json' });
        }
    });
});


app.get('/', (req, res) => {
    res.render('index');
});

app.get('/landing', (req, res) => {
    res.render('landing');
})


app.post('/submit', (req, res) => {
    // TODO Re-do /submit redirect on homepage.
    const userIp = req.clientIp;
    const selectedUrl = req.body.customUrl || req.body.mdmUrl;
    const selectedVersion = req.body.enrollmentType;
    const updateDataJson = (data) => {
        data[userIp] = { url: selectedUrl, Version: selectedVersion };
        fs.writeFile('data.json', JSON.stringify(data), (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error updating data.json');
                return;
            }
            // res.send('URL selection saved.');
            // res.status(200).json({ message: 'Data saved successfully!' });
            res.status(200).render('index', { message: 'Data saved successfully!', url: selectedUrl, version: selectedVersion === 'mdm-byod' ? 'User Enrollment' : 'Device Enrollment' });
        });
    };

    fs.readFile('data.json', (err, data) => {
        if (err && err.code === 'ENOENT') {
            updateDataJson({});
        } else if (err) {
            console.error(err);
            res.status(500).send('Error reading data.json');
        } else {
            try {
                const jsonData = JSON.parse(data);
                updateDataJson(jsonData);
            } catch (parseErr) {
                console.error(parseErr);
                res.status(500).send('Error parsing data.json');
            }
        }
    });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
