const puppeteer = require('puppeteer-core');
const express = require('express');
const cors = require('cors');


const app = express();

app.use(cors());
app.use(express.json());

const taza = 4000;
const porcentaje = 20;

function getNumbersInString(string) {
    var tmp = string.split("");
    
    var map = tmp.map(function(current) {
        if (!isNaN(parseInt(current))) {
            return current;
        }
    });

    var numbers = map.filter(function(value) {
        return value != undefined;
    });

    return numbers.join("");
}

function calcularPrecioCOL(precio_usd){
    let precio_col = precio_usd * taza;
    let aux = (precio_col * porcentaje) / 100;
    return precio_col + aux;
}

const formatterPeso = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0
});


app.post('/scraping-prod', async (req, res) => {
    
    const browser = await puppeteer.launch(
        {
            headless: false,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        }
    );

    const page = await browser.newPage();
    const m = puppeteer.devices['iPhone SE'];
    await page.emulate(m);


    
    await page.setJavaScriptEnabled(false);
    await page.goto(req.body.url, {timeout: 0});
   
    //images
    const images = await page.evaluate(() =>{
        let elements = document.querySelector('#product-image-gallery');
            elements = elements.querySelectorAll('noscript');
            
        const imagesSrc = []
        for (let i = 0; i < elements.length; i++) {
            let src = elements[i].querySelector('img').getAttribute('src');
            imagesSrc.push(src);
        }
        

        return imagesSrc;
    });

    //name
    const name = await page.$eval('div#title_feature_div span#title',  el => el.innerText);
    
    //precio
    let precio_usd = "";
    let precio_col = 0;
    const precio = await page.evaluate(() =>{ 
        if ( document.querySelector('div#corePrice_feature_div .a-price-whole') ){
           return document.querySelector('div#corePrice_feature_div .a-price-whole').innerText;
        }

        return "";
     });

   

     if( precio != "" && precio != "undefined" ){
        precio_usd = getNumbersInString(precio);
        precio_col = formatterPeso.format(calcularPrecioCOL(precio_usd));
     }
        
    //Descripcion
    const despc = await page.$eval('div#productDescription_fullView p',  el => el.innerText);

   
    await browser.close();

    res.json({
        data: {
            nom: name,
            cost: precio_usd,
            cost_col: precio_col,
            desp: despc,
            img: images
        }
    }) 
})

app.post('/scraping-cate', async (req, res) => {
    
    const browser = await puppeteer.launch(
        {
            headless: false,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        }
    );

    const page = await browser.newPage();
    
    await page.setJavaScriptEnabled(false);
    await page.goto(req.body.url, {timeout: 0});
    
    await page.waitFor(2000);
    let products = [];
    let size = 0;   

     const next = await page.evaluate(() =>{ 
        const objeto = {};
        if ( document.querySelector('div#search') ){
            let container = document.querySelector('div#search .s-desktop-width-max > .s-matching-dir');
                container = container.querySelector('.s-main-slot.s-result-list')

            let contPaginatio =  container.querySelector('.s-pagination-container .s-pagination-strip')

            if ( contPaginatio.querySelector('a.s-pagination-next') ){
                objeto.url = 'https://amazon.com'+contPaginatio.querySelector('a.s-pagination-next').getAttribute('href');
                objeto.size = contPaginatio.querySelector('.s-pagination-item.s-pagination-ellipsis').nextSibling.innerText; 

                return objeto;
            }
        }

        return "";
     });

    if ( size == 0 && next != "" )
        size = next.size;

    if ( next != null ){
        //let url = next.url;
        for (let i = 1; i < 2; i++) {
            let url = next.url + '&page='+i;
            await page.goto(url, {timeout: 0});
            await page.waitForSelector('div#search');

             //buscar producto
            const search = await page.evaluate(() =>{ 
                let result = [];
                

                if ( document.querySelector('div#search') ){
                    let container = document.querySelector('div#search .s-matching-dir');
                        container = container.querySelector('.s-main-slot.s-result-list')

                    let elements = container.querySelectorAll('div.s-card-container');
                    console.log(elements);

                    for (let i = 0; i < elements.length; i++) {
                        
                        if( elements[i].querySelector('a.s-link-style span.a-price .a-offscreen') ){

                            let auxArray = [
                                elements[i].querySelector('.s-product-image-container img').getAttribute('src'),
                                elements[i].querySelector('h2  a > span.a-text-normal').innerText,
                                elements[i].querySelector('a.s-link-style span.a-price .a-price-whole').innerText,
                            ];

                            result.push(auxArray);
                        }
                        
                    }

                }

                return result;
            });

            for (let i = 0; i < search.length; i++) {
                let precio_usd = getNumbersInString(search[i][2]);
                let = auxArray = {
                    'img': search[i][0],
                    'name': search[i][1],
                    'price': precio_usd,
                    'price_col': formatterPeso.format(calcularPrecioCOL(precio_usd))
                }

                products.push(auxArray);
            }
          
        }
    }

   // await browser.close();

    res.json({
        data: products
    }) 
})

app.listen(5050, () =>{
    console.log("hola mundo  2")
});