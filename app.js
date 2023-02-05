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
const carsCollection = 'cars';
const acquisitionsCollection = 'acquisitions';
const express = require('express');
const bodyParser = require('body-parser')

const app = express();
const main = express();
const cors = require('cors');
const contextPath = '/api/v1';
const jsonParser = bodyParser.json()

app.use(express.urlencoded({ extended: false }))
app.use(express.json()) //we expect JSON data to be sent as payloads
app.use(cors());
app.use(bodyParser.json())

const port = 3000;
const bcrypt = require('bcrypt');
const saltRounds = 10;

main.use(contextPath, app);

const logger = require('morgan'); //importing a HTTP logger
const jwt = require("jsonwebtoken");

app.use(logger('dev')); //using the HTTP logger library

app.get('/users', async (req, res) => {
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
                        isAdmin: !!user.isAdmin,
                        email: user.email
                    }
                    token = jwt.sign(data, 'secret_key', options);
                    console.log('here')
                    return res.status(200).json({
                        message: 'Login successful.',
                        jwtToken: token,
                        isAdmin: data.isAdmin,
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

app.get('/cars', async (req, res) => {
    try {
        let header = req.header('Authorization')
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;

        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded) {
                let cars = [];
                await db.collection(carsCollection).get().then(async (querySnapshot) => {
                    let docs = querySnapshot.docs;
                    for (let doc of docs) {
                        const car = doc.data()
                        cars.push(car)
                    }
                });

                return res.status(200).send({
                    message: cars,
                    isError: false
                })
            } else {
                return res.status(500).send({
                    message: 'API protected',
                    isError: true
                })
            }
        } else {
            return res.status(500).send({
                message: 'API protected, requires JWT Token.',
                isError: true
            })
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

const carEquals = (car, carToBeCompared) => {
    console.log(car)
    console.log(carToBeCompared)
    return ((car.brand.toString() === carToBeCompared.brand.toString())
            && (car.modelName.toString() === carToBeCompared.modelName.toString())
            && (parseInt(car.engineCapacity) === parseInt(carToBeCompared.engineCapacity))
            && (parseInt(car.hp) === parseInt(carToBeCompared.hp))
            && (parseInt(car.manufacturingYear) === parseInt(carToBeCompared.manufacturingYear)))
            && (parseFloat(car.price) === parseFloat(carToBeCompared.price))
}

const editCar = (oldCar, newCar) => {
    oldCar.brand = newCar.brand
    oldCar.modelName = newCar.modelName
    oldCar.engineCapacity = newCar.engineCapacity
    oldCar.hp = newCar.hp
    oldCar.manufacturingYear = newCar.manufacturingYear
    oldCar.price = newCar.price
}

app.post('/cars', jsonParser, async (req, res) => {
    try {
        let header = req.header('Authorization')
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;
        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded) {
                const newCar = req.body.newItem;
                let found = false;
                await db.collection(carsCollection).where('brand', '==', newCar.brand.toString())
                    .where('engineCapacity', '==', newCar.engineCapacity.toString())
                    .where('hp', '==', newCar.hp.toString())
                    .where('manufacturingYear', '==', newCar.manufacturingYear.toString())
                    .where('modelName', '==', newCar.modelName.toString())
                    .where('price', '==', newCar.price.toString())
                    .get().then(async (querySnapshot) => {
                        let docs = querySnapshot.docs
                        for (let doc of docs) {
                            found = true;
                            console.log(doc.data())
                            await doc.ref.update({quantity: doc.data().quantity + 1});
                        }
                    })

                console.log(found);
                if (!found) {
                    await db.collection(carsCollection).add(newCar);
                }
                return res.status(201).send({
                    message: 'Car successfully created!',
                    isError: false
                })
            } else {
                return res.status(500).send({
                    message: 'API protected',
                    isError: true
                })
            }
        } else {
            return res.status(500).send({
                message: 'API protected, requires JWT Token.',
                isError: true
            })
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

app.put('/cars', jsonParser, async (req, res) => {
    try {
        let header = req.header('Authorization')
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;
        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded) {
                const oldItem = req.body.oldItem
                const newItem = req.body.newItem
                let wasCarEdited = false
                await db.collection(carsCollection).get().then(async (querySnapshot) => {
                    let docs = querySnapshot.docs;
                    for (let doc of docs) {
                        const car = doc.data()
                        const isEqual = carEquals(car, oldItem)

                        if (isEqual) {
                            editCar(car, newItem)
                            console.log(car)

                            if (!wasCarEdited) {
                                await db.collection(carsCollection)
                                    .doc(doc.id)
                                    .update(newItem)
                                    .then(innerRes => {
                                        console.log(innerRes)
                                        wasCarEdited = true;

                                        return res.status(204).send({
                                            message: 'Car updated successfully.',
                                            isError: false
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        return res.status(500).send({
                                            message: 'Could not edit car',
                                            isError: true
                                        })
                                    });
                            }
                        }
                    }
                })
                if (!wasCarEdited) {
                    return res.status(500).send({
                        message: 'Something went wrong.',
                        isError: true
                    })
                }
            } else {
                return res.status(500).send({
                    message: 'API protected',
                    isError: true
                })
            }
        } else {
            return res.status(500).send({
                message: 'API protected, requires JWT Token.',
                isError: true
            })
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

app.delete('/cars', jsonParser, async (req, res) => {
    try {
        let header = req.header('Authorization')
        console.log(header);
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;
        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded) {
                const carToBeDeleted = req.body.key

                console.log(carToBeDeleted)
                db.collection(carsCollection).where('brand', '==', carToBeDeleted.brand.toString())
                    .where('engineCapacity', '==', carToBeDeleted.engineCapacity.toString())
                    .where('hp', '==', carToBeDeleted.hp.toString())
                    .where('manufacturingYear', '==', carToBeDeleted.manufacturingYear.toString())
                    .where('modelName', '==', carToBeDeleted.modelName.toString())
                    .where('price', '==', carToBeDeleted.price.toString())
                    .limit(1)
                    .get().then(async (querySnapshot) => {
                    let docs = querySnapshot.docs
                    for (let doc of docs) {
                        console.log(doc.data())
                        await doc.ref.delete();
                    }
                }).catch(err => {
                    console.log(err)
                    return res.status(500).send({
                        message: 'Delete failed',
                        isError: true
                    })
                })
                return res.status(202).send({
                    message: 'Car deleted',
                    isError: false
                })
            } else {
                return res.status(500).send({
                    message: 'API protected',
                    isError: true
                })
            }
        } else {
            return res.status(500).send({
                message: 'API protected, requires JWT Token.',
                isError: true
            })
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

app.post('/cart', jsonParser, async (req, res) => {
    try {
        let header = req.header('Authorization')
        console.log(header);
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;
        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded) {
                const email = decoded.email;
                const cars = req.body.cars;

                let user = undefined;

                let carsBought = [];
                let price = 0;
                for (let car of cars) {
                    await db.collection(userCollection).where('email', '==', email).get().then(async (querySnapshot) => {
                        let docs = querySnapshot.docs
                        for (let doc of docs) {
                            user = doc.data()
                        }
                    }).catch(err => {
                        console.log(err)
                        return res.status(500).send({
                            message: 'Acquisition failed',
                            isError: true
                        })
                    })

                    console.log(car);

                    await db.collection(carsCollection).where('brand', '==', car.brand.toString())
                        .where('engineCapacity', '==', car.engineCapacity.toString())
                        .where('hp', '==', car.hp.toString())
                        .where('manufacturingYear', '==', car.manufacturingYear.toString())
                        .where('modelName', '==', car.modelName.toString())
                        .where('price', '==', car.price.toString())
                        .limit(car.quantity)
                        .get().then(async (querySnapshot) => {
                            let docs = querySnapshot.docs;

                            for (let doc of docs) {
                                if (car.quantity >= doc.data().quantity) {
                                    return res.status(500).send({
                                        message: 'Acquisition failed',
                                        isError: true
                                    })
                                } else {
                                    carsBought.push({
                                        brand: doc.data().brand,
                                        modelName: doc.data().modelName,
                                        hp: doc.data().hp,
                                        engineCapacity: doc.data().engineCapacity,
                                        price: doc.data().price,
                                        manufacturingYear: doc.data().manufacturingYear,
                                        quantity: car.quantity
                                    })
                                    price += parseFloat(doc.data().price) * car.quantity
                                    await doc.ref.update({quantity: doc.data().quantity - car.quantity});
                                }
                            }
                        }).catch(err => {
                            console.log(err)
                            return res.status(500).send({
                                message: 'Acquisition failed',
                                isError: true
                            })
                        })
                }

                if (carsBought.length > 0) {
                    await db.collection(acquisitionsCollection).add({
                        email: user.email,
                        cars: carsBought,
                        price: price,
                        date: Date.now()
                    });
                }

                return res.status(201).send({
                    message: 'Acquisition successful!',
                    isError: false
                })
            } else {
                return res.status(500).send({
                    message: 'API protected',
                    isError: true
                })
            }
        } else {
            return res.status(500).send({
                message: 'API protected, requires JWT Token.',
                isError: true
            })
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

main.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
});