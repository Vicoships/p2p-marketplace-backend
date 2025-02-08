
// Importation des modules nécessaires
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Configuration
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Connexion à la base de données MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connecté"))
  .catch(err => console.log(err));

// Modèle utilisateur
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    role: { type: String, enum: ['buyer', 'seller'], default: 'buyer' }
});

const User = mongoose.model('User', UserSchema);

// Modèle service
const ServiceSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const Service = mongoose.model('Service', ServiceSchema);

// Inscription
app.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, role });
    await user.save();
    res.status(201).send("Utilisateur créé");
});

// Connexion
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send("Email ou mot de passe incorrect");
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Création d'un service (réservé aux vendeurs)
app.post('/services', async (req, res) => {
    const { title, description, price, sellerId } = req.body;
    const service = new Service({ title, description, price, seller: sellerId });
    await service.save();
    res.status(201).json(service);
});

// Récupérer tous les services
app.get('/services', async (req, res) => {
    const services = await Service.find().populate('seller', 'username');
    res.json(services);
});

// Lancer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur en écoute sur le port ${PORT}`));
