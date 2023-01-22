// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Initialize Firebase
const admin = require('firebase-admin');
const serviceAccountKey = require('./serviceAccountKey.json');

admin.initializeApp( {
    credential: admin.credential.cert(serviceAccountKey)
});

const i = 'jwt-node'
const s = 'jwt-node'
const a = 'jwt-node'

const options = {
    issuer: i,
    subject: s,
    audience: a,
    expiresIn: '8784h',
    algorithm: 'HS256',
}

const verifyOptions = {
    issuer: i,
    subject: s,
    audience: a,
    expiresIn: '8784h',
    algorithm: ['HS256'],
}

const db = admin.firestore();
const userCollection = 'users';
const express = require('express');
const app = express();
const main = express();
const cors = require('cors');
const contextPath = '/api/v1';

app.use(express.urlencoded({ extended: false }))
app.use(express.json()) //we expect JSON data to be sent as payloads
app.use(cors());

const port = 3000;
const bcrypt = require('bcrypt');
const saltRounds = 10;

main.use(contextPath, app);

const logger = require('morgan'); //importing a HTTP logger
const jwt = require("jsonwebtoken");

app.use(logger('dev')); //using the HTTP logger library

app.get('/', async (req, res) => {
    try {
        let header = req.header('Authorization')
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;

        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded.isAdmin) {
                let response = []
                await db.collection(userCollection).get().then(querySnapshot => {
                    let docs = querySnapshot.docs;
                    for (let doc of docs) {
                        response.push(doc.data())
                    }
                    return res.status(200).send({
                        message: response,
                        isError: false
                    });
                })
            } else {
                return res.status(500).send({
                    message: 'API Secured, user not allowed.',
                    isError: true
                });
            }
        } else {
            return res.status(500).send({
                message: 'Missing Authorization Header',
                isError: true
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error',
            isError: true
        });
    }
});

app.post('/register', (req, res) => {
    let userToAdd = req.body

    db.collection(userCollection).get().then(innerRes => {
        let docs = innerRes.docs
        let found = false
        for (let doc of docs) {
            let user = doc.data()
            if (user.email === userToAdd.email) {
                found = true;
                break;
            }
        }

        if (found === false) {
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(userToAdd.password, salt, async function (err, hash) {
                    userToAdd.password = hash
                    userToAdd.isAdmin = false
                    userToAdd.isDisabled = false

                    await db.collection(userCollection).add(userToAdd);

                    return res.status(200).send({
                        message: 'User created.',
                        isError: false
                    });
                });
            })
        } else {
            return res.status(500).send({
                message: 'User already present in database.',
                isError: true
            });
        }
    }).catch(() => {
        return res.status(500).send({
            message: 'Registration failed.',
            isError: true
        });
    })
})

app.post('/login', async (req, res) => {
    let loginUser = req.body
    let token = '';
    if (loginUser.isDisabled) {
        return res.status(500).send({
            message: 'User is blocked',
            isError: true
        })
    }
    await db.collection(userCollection).get().then(async (querySnapshot) => {
        let docs = querySnapshot.docs;
        let found = false;
        for (let doc of docs) {
            const user = doc.data();

            if (user.email === loginUser.email) {
                found = true;
                console.log(user.password, loginUser.password);
                if (await bcrypt.compare(loginUser.password, user.password)) {
                    let data = {
                        time: Date(),
                        isAdmin: !!user.isAdmin
                    }
                    token = jwt.sign(data, 'secret_key', options);
                    console.log('here')
                    return res.status(200).json({
                        message: 'Login successful.',
                        jwtToken: token,
                        isError: false
                    });
                } else {
                    return res.status(500).send({
                        message: 'Invalid password.',
                        isError: true
                    });
                }
            }
        }
        if (found === false) {
            return res.status(500).send({
                message: 'User not present in database.',
                isError: true
            })
        }
    }).catch((err) => {
        console.log(err)
        return res.status(500).send({
            message: 'User not present in database.',
            isError: true
        })
    })
})

main.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
});