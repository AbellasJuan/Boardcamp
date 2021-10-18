import express from "express";
import cors from 'cors';
import pg from 'pg';
import joi from 'joi';
import dayjs from "dayjs";

const app = express();

app.use(cors());
app.use(express.json());

const { Pool } = pg;

const connection = new Pool({
user: 'bootcamp_role',
password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
host: 'localhost',
port: 5432,
database: 'boardcamp'
});

//GET CATEGORIES
app.get("/categories", async (req, resp) => {
    try{
    const result = await connection.query(`SELECT * FROM categories`);
    //coloquei dentro da const result o 'await' para travar ate ele responder e fiz o connection.query para conectar com o banco de dados o pedido de selecionar todas as categories;
    resp.send(result.rows);
    //a resposta que me é enviada sao todas as fileiras da minha requisiçao;
    }

    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    }
});

//POST CATEGORIES
app.post('/categories', async (req, resp) => {
    const name = req.body.name;
    //aqui eu peguei o que tinha dentro do body. Só tinha o 'name';
    try {
    if(!name){
        //se !name retornar true quer dizer que nao foi enviado nada e dá erro;
        return resp.sendStatus(400);
        //me responde status 400;
    }

    const allCategoriesName = await connection.query(`SELECT * FROM categories`);
    //coloquei na variavel as categorias existentes
    if(allCategoriesName.rows.some(category => category.name === name)){
        //peguei a array das categorias e percorri com SOME pra me retornar true or false se já existir alguma categoria igual;
        return resp.sendStatus(409);
        //se tiver aquele nome vai me retornar status 409;;
    }
    
    await connection.query(`INSERT INTO categories (name) VALUES ($1)`, [name]);
    //await pra só continuar quando isso for resolvido.
    //aqui falei pro meu banco de dados que eu quero inserir em categories no campo NAME (pq id tá automatico) e o valor que eu quero botar ('$1' dizendo que vai entrar algo ali, para evitar o sql injection) e depois passamos realmente o valor do $1, [name];
    resp.sendStatus(201);
    //envia status 201 se criou e deu bom;
    }

    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    }
});

//GET  GAMES
app.get('/games' , async (req, resp) => {
    const { name } = req.query;

    let result;

    try{
    if(name){
        result = await connection.query(`SELECT * FROM games WHERE name ILIKE $1`, [`${name}%`]);
    } else{
        result = await connection.query(`SELECT * FROM games`);
    }
    
    resp.send(result.rows);
    }

    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    }
});

//POST GAMES
app.post('/games' , async (req, resp) =>{
    const {name, image, stockTotal, categoryId, pricePerDay} = req.body;

    const schemaGames = joi.object({
    name: joi.string().min(1).required(),
    image: joi.string().pattern(/(http(s?):)([/|.|\w|\s|-])*.(?:jpg|gif|png)/).required(),
    stockTotal: joi.number().min(1).integer(),
    pricePerDay: joi.number().min(1),
    categoryId: joi.number().required(),
    }).unknown();
    //UNKNOWN() PQ TAVA MANDANDO EU COLOCAR IMAGE. ASSIM ELE NAO PEDE PRA COLOCAR JOI PRA TODAS AS PROPRIEDADES.
    try {
    if(schemaGames.validate(req.body).error){
        console.log(schemaGames.validate(req.body).error)
        return resp.sendStatus(400);
    }

    const allGamesName = await connection.query(`SELECT * FROM games`);
    
    if(allGamesName.rows.some(game => game.name === name)){
        return resp.sendStatus(409);
    }
    
    await connection.query(`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)`, [name, image, stockTotal, categoryId, pricePerDay]);

    resp.sendStatus(201);
    }
    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    }
});

//GET CUSTOMERS
app.get('/customers' , async (req, resp) => {
    const { cpf } = req.query;
    let result;

    try{
    if(cpf){
        console.log('entrei aqui nesse if');
        result = await connection.query(`SELECT * FROM customers WHERE cpf ILIKE $1`, [`${cpf}%`]);
    }else {
        result = await connection.query(`SELECT * FROM customers`);
    }
    resp.send(result.rows);
    }

    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    }
})

//GET CUSTOMER BY ID
app.get('/customers/:id' , async (req, resp) => {
    
    try{
    const result = await connection.query(`SELECT * FROM customers WHERE id = $1`, [req.params.id]);
//Useri o req.params.id pq ele é enviado como params e nao no corpo.
    if(result.rows.length > 0){
        resp.send(result.rows[0]);
    } else {
        resp.sendStatus(404);
    }
    }  

    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    } 
//Se nao encontrar vai entrar no 404 e se encontrar vai ter um length maior quer zero e me retornar a unica row que é a unica com aquele id.(por isso posso colocar [0]);
});

//POST CUSTOMERS
app.post('/customers', async (req, resp) => {
    const { name, phone, cpf, birthday } = req.body;
    try{
    const schemaCustomers = joi.object({
        name: joi.string().min(2).required(),
        phone: joi.string().min(10).max(11).required(),
        cpf: joi.string().pattern(/^[0-9]+$/).length(11).required(),
        birthday: joi.date().iso().required(),
        }).unknown();

    if(schemaCustomers.validate(req.body).error){
        console.log(schemaCustomers.validate(req.body).error)
        return resp.sendStatus(400);
    };

    const allCustomersCpf = await connection.query(`SELECT * FROM customers`);
    
    if(allCustomersCpf.rows.some(customerCpf => customerCpf.cpf === cpf)){
        return resp.sendStatus(409);
    }
    
        await connection.query(`INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)`, [name, phone, cpf, birthday]);
        resp.sendStatus(201);
    }

    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    }
});

//PUT CUSTOMERS
app.put("/customers/:id", async (req, resp) => {
    const { name, phone, cpf, birthday } = req.body;
    const { id } = req.params;

    try{
        const schemaCustomers = joi.object({
            name: joi.string().min(2).required(),
            phone: joi.string().min(10).max(11).required(),
            cpf: joi.string().pattern(/^[0-9]+$/).length(11).required(),
            birthday: joi.date().iso().required(),
            }).unknown();
    
        if(schemaCustomers.validate(req.body).error){
            console.log(schemaCustomers.validate(req.body).error)
            return resp.sendStatus(400);
        };


        const allCustomersCpf = await connection.query(`SELECT * FROM customers`);
        
        if(allCustomersCpf.rows.some(customerCpf => customerCpf.cpf === cpf)){
            return resp.sendStatus(409);
        }

        await connection.query(`UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE id= $5`, [name, phone, cpf, birthday, id]);
        resp.sendStatus(200);
    }
    
    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    }
});

//GET RENTALS
app.get('/rentals' , async (req, resp) => {
   
    try{
    const result = await connection.query(`SELECT * FROM rentals`);
    resp.send(result.rows);
    }

    catch(error){
        console.log(error);
        resp.sendStatus(500);
    }
});

//POST RENTALS
app.post('/rentals' , async (req, resp) => {
    const { customerId, gameId, daysRented } = req.body;

    try{
    const gettingGame = await connection.query(`SELECT * FROM games WHERE id=$1`, [gameId]);

    if(gettingGame.rows.length === 0){
        return resp.sendStatus(400);
    }

    const openRentals = await connection.query(`SELECT * FROM rentals WHERE "gameId" = $1 AND "returnDate" IS null`, [gameId]);

    if(openRentals.rows.length >= gettingGame.rows[0].stockTotal){
        return resp.sendStatus(400);
    }

    const originalPrice = gettingGame.rows[0].pricePerDay * daysRented;

        await connection.query(
            `INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "originalPrice", "returnDate", "delayFee") 
            VALUES ($1, $2, now(), $3, $4, null, null)`, 
            [customerId, gameId, daysRented, originalPrice]);

        resp.sendStatus(201);
    }

    catch(error) {
        console.log(error);
        resp.sendStatus(500);
    }
});

//POST FINISH RENTALS
app.post('/rentals/:id/return', async (req, resp) => {
    const { id } = req.params;
    
    
    const rental = await connection.query(`
    SELECT rentals."rentDate", games."pricePerDay", games."daysRented" 
    FROM rentals 
    JOIN games 
    ON games.id = rentals."gameId" 
    WHERE rentals.id=$1`, [id]);

    const { rentDate, pricePerDay, daysRented } = rental.rows[0];

    const todayDate = dayjs();
    const totalDaysRented = todayDate.diff(rentDate, "day");

    let delayFee = null;

    if(totalDaysRented > daysRented){
        delayFee = (totalDaysRented - daysRented) * pricePerDay;
    }

    await connection.query(`
    UPDATE rentals 
    SET "returnDate" = now(), "delayFee" = $1
    WHERE id=$2`, [delayFee, id]);
    resp.sendStatus(200)
});

//ERASE RENTALS
app.delete('/rentals/:id', async (req, resp) => {
    
    try{
    const rental = await connection.query(`SELECT * FROM rentals WHERE id = $1 AND "returnDate" IS not null` [req.params.id]);
    
    if(rental.rows.length > 0){
        return resp.sendStatus(400);
    }

    await connection.query(`DELETE FROM rentals WHERE id = $1`, [req.params.id]);
    resp.sendStatus(200)
    }
    
    catch(error){
        console.log(error);
        resp.sendStatus(500);
    }
});


app.listen(4000 , () => {
    console.log("Server ON");
});