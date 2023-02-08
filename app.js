// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Initialize Firebase
const admin = require('firebase-admin');
const serviceAccountKey = require('/etc/secrets/serviceAccountKey.json');

admin.initializeApp( {
    credential: admin.credential.cert(serviceAccountKey)
});

//const Chance = require('chance');
//const chance = Chance();

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
const bcrypt = require("bcrypt");


/*const createUsers = async () => {

    for (let i = 0; i < 50; i++) {
        let fullname = chance.name();
        let email = fullname.toLowerCase().replace(' ', '.') + '@gmail.com';

        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash('Test1234', salt, async function (err, hash) {
                let user = {
                    fullname: fullname,
                    email: email,
                    isAdmin: false,
                    isDisabled: false,
                    password: hash,
                    country: chance.pickone(['RO', 'MD'])
                }
                await db.collection(userCollection).add(user)
            })
        })
    }
}

const createCar = async () => {
    for (let i = 0; i < 50; i++) {
        let brand = chance.pickone(['Opel', 'Dacia', 'Volvo', 'BMW', 'Audi'])
        let modelName = '';
        let hp = 0;
        let price = 0;
        let engineCapacity = 0;
        switch (brand) {
            case 'Opel':
                modelName = chance.pickone(['Astra', 'Zafira', 'Mokka', 'Vectra', 'Corsa'])
                hp = chance.pickone([90, 100, 105, 110, 125, 150])
                price = chance.pickone([10000, 12500, 15000, 17500])
                engineCapacity = chance.pickone([1000, 1200, 1400, 1600, 1800])
                break;
            case 'Dacia':
                modelName = chance.pickone(['Logdan', 'Duster', 'Lodgy', 'Spring', 'Sandero'])
                hp = chance.pickone([90, 100, 105, 110, 120])
                price = chance.pickone([10000, 12500, 15000, 17500])
                engineCapacity = chance.pickone([900, 1000, 1200, 1400, 1600])
                break;
            case 'Volvo':
                modelName = chance.pickone(['S60', 'V60', 'S90', 'V90', 'V40'])
                hp = chance.pickone([110, 120, 150, 175, 200])
                price = chance.pickone([20000, 25000, 30000, 35000])
                engineCapacity = chance.pickone([1400, 1600, 1800, 2000])
                break;
            case 'BMW':
                modelName = chance.pickone(['Series 1', 'Series 3', 'Series 5', 'X3', 'X5'])
                hp = chance.pickone([150, 175, 200, 250])
                price = chance.pickone([35000, 40000, 45000, 50000])
                engineCapacity = chance.pickone([1800, 2000, 2200, 3000])
                break;
            case 'Audi':
                modelName = chance.pickone(['A4', 'A6', 'A8', 'Q5', 'Q8'])
                hp = chance.pickone([150, 175, 200, 250])
                price = chance.pickone([35000, 40000, 45000, 50000])
                engineCapacity = chance.pickone([1800, 2000, 2200, 3000])
                break;
        }
        let manufacturingYear = chance.integer({min: 2018, max: 2022})

        let found = false;
        await db.collection(carsCollection).where('brand', '==', brand)
            .where('engineCapacity', '==', engineCapacity)
            .where('hp', '==', hp)
            .where('manufacturingYear', '==', manufacturingYear)
            .where('modelName', '==', modelName)
            .where('price', '==', price)
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
            await db.collection(carsCollection).add({
                brand: brand.toString(),
                engineCapacity: engineCapacity.toString(),
                hp: hp.toString(),
                manufacturingYear: manufacturingYear.toString(),
                modelName: modelName.toString(),
                price: price.toString(),
                quantity: 1
            });
        }
    }
}

createCar();
createUsers();*/

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
const saltRounds = 10;

main.use(contextPath, app);

const logger = require('morgan'); //importing a HTTP logger
const jwt = require("jsonwebtoken");

app.use(logger('dev')); //using the HTTP logger library


app.put('/users/disable', async (req, res) => {
    try {
        let header = req.header('Authorization')
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;

        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded.isAdmin) {
                const email = req.body.email
                await db.collection(userCollection)
                    .where("email", "==", email)
                    .get().then(async (querySnapshot) => {
                        let docs = querySnapshot.docs
                        for (let doc of docs) {
                            await doc.ref.update({isDisabled: !doc.data().isDisabled})
                        }
                    });
                return res.status(204).send({
                    message: 'User updated successfully.',
                    isError: false
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
})

app.put('/users/admin', async (req, res) => {
    try {
        let header = req.header('Authorization')
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;

        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded.isAdmin) {
                const email = req.body.email
                await db.collection(userCollection)
                    .where("email", "==", email)
                    .get().then(async (querySnapshot) => {
                        let docs = querySnapshot.docs
                        for (let doc of docs) {
                            await doc.ref.update({isAdmin: !doc.data().isAdmin})
                        }
                    });
                return res.status(204).send({
                    message: 'User updated successfully.',
                    isError: false
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
})

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

app.get('/acquisitions', async (req, res) => {
    try {
        let header = req.header('Authorization')
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;

        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded.isAdmin) {
                const acquisitionResponseArray = [];
                await db.collection(acquisitionsCollection).get()
                    .then(async (querySnapshot) => {
                        const docs = querySnapshot.docs;
                        for (let doc of docs) {
                            const acquisition = doc.data();
                            let acquisitionResponse = {
                                fullname: '',
                                email: '',
                                cars: [],
                                price: '',
                                date: ''
                            }

                            acquisitionResponse.cars = acquisitionResponse.cars.concat(acquisition.cars)
                            acquisitionResponse.price = acquisition.price
                            acquisitionResponse.date = new Date(acquisition.date).toLocaleDateString("en-US");
                            await db.collection(userCollection)
                                .where('email', '==', acquisition.email)
                                .get().then((innerQuery) => {
                                    const innerDocs = innerQuery.docs;

                                    for (let innerDoc of innerDocs) {
                                        let user = innerDoc.data()
                                        acquisitionResponse.fullname = user.fullname
                                        acquisitionResponse.email = user.email
                                    }
                                })

                            acquisitionResponseArray.push(acquisitionResponse);
                        }
                    })

                return res.status(200).send({
                    message: acquisitionResponseArray,
                    isError: false
                })
            }else {
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
})

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
                if (user.isDisabled) {
                    return res.status(500).send({
                        message: 'User is blocked',
                        isError: true
                    })
                }
                if (await bcrypt.compare(loginUser.password, user.password)) {
                    let data = {
                        time: Date(),
                        isAdmin: !!user.isAdmin,
                        email: user.email
                    }
                    token = jwt.sign(data, 'secret_key', options);
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
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

const carEquals = (car, carToBeCompared) => {

    return ((car.brand.toString() === carToBeCompared.brand.toString())
            && (car.modelName.toString() === carToBeCompared.modelName.toString())
            && (parseInt(car.engineCapacity) === parseInt(carToBeCompared.engineCapacity))
            && (parseInt(car.hp) === parseInt(carToBeCompared.hp))
            && (parseInt(car.manufacturingYear) === parseInt(carToBeCompared.manufacturingYear)))
            && (parseFloat(car.price) === parseFloat(carToBeCompared.price))
}

const editCar = (oldCar, newCar) => {
    let editedProperties = {};

    if (oldCar.brand.toString() !== newCar.brand.toString()) {
        editedProperties.brand = newCar.brand.toString()
    }
    if (oldCar.modelName.toString() !== newCar.modelName.toString()) {
        editedProperties.modelName = newCar.modelName.toString()
    }
    if (oldCar.engineCapacity.toString() !== newCar.engineCapacity.toString()) {
        editedProperties.engineCapacity = newCar.engineCapacity.toString()
    }
    if (oldCar.hp.toString() !== newCar.hp.toString()) {
        editedProperties.hp = newCar.hp.toString()
    }
    if (oldCar.manufacturingYear.toString() !== newCar.manufacturingYear.toString()) {
        editedProperties.manufacturingYear = newCar.manufacturingYear.toString()
    }
    if (oldCar.price.toString() !== newCar.price.toString()) {
        editedProperties.price = newCar.price.toString()
    }

    if (Object.keys(editedProperties).length === 0) {
        return null;
    }
    return editedProperties;
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
                            await doc.ref.update({quantity: doc.data().quantity + 1});
                        }
                    })

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
                            let editedProperties = editCar(car, newItem)

                            if (!wasCarEdited && editedProperties !== null) {
                                await db.collection(carsCollection)
                                    .doc(doc.id)
                                    .update(editedProperties)
                                    .then(() => {
                                        wasCarEdited = true;

                                        return res.status(204).send({
                                            message: 'Car updated successfully.',
                                            isError: false
                                        })
                                    }).catch(() => {
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
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

app.delete('/cars', jsonParser, async (req, res) => {
    try {
        let header = req.header('Authorization')
        const token = header !== undefined ? header.split('Bearer ')[1] : undefined;
        if (token !== undefined) {
            const decoded = jwt.verify(token, 'secret_key', verifyOptions)
            if (decoded) {
                const carToBeDeleted = req.body.key

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
                        await doc.ref.delete();
                    }
                }).catch(err => {
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
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

app.post('/cart', jsonParser, async (req, res) => {
    try {
        let header = req.header('Authorization')
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
                        return res.status(500).send({
                            message: 'Acquisition failed, user not found',
                            isError: true
                        })
                    })

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
                                if (car.quantity > doc.data().quantity) {
                                    return res.status(500).send({
                                        message: 'Acquisition failed, not enough quantity for car ' + car.brand + ' ' + car.modelName,
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
        return res.status(500).send({
            message: 'You are not logged in.',
            isError: true
        })
    }
})

main.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
});