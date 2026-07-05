---
tags:
  - article-like
---
The **Reuters Instrument Code (RIC)** is one of the most widely used identifiers for referencing stocks. Traders are intimately familiar with the **Bloomberg Identifier**. However, there is a free, open-source alternative known as the **Financial Instrument Global Identifier (FIGI)**. These are part of "stock symbology", which is an essential aspect of trading systems and must-have knowledge in the world of algorithmic trading. Here, I'll give a quick crash course on relevant stock information to understand the symbology behind them, and then dive into fun features like the concept of "uniqueness" and why it matters.

<a href="#uniqueness"><sup>If you already know about stock trading and want to learn about uniquely identifying stocks and the intricacies of stock symbology, click here to dive straight in</sup></a>

# What is Stock Symbology?

You've probably heard of stocks. Maybe you heard of the GameStop fiasco in 2021, where the stock shot up in value. Maybe you've invested in some and monitor them religiously. Most people identify a stock by its company name, but many other identifiers are used. This is where the term "Symbology" comes in. **Stock symbology** is the use of any combination of numbers and letters to identify a stock. You identify it using a "symbol", hence "symbology".  

One of the most common symbologies is **Ticker**. Back to our GameStop example, its ticker is `GME`. Another popular example is Apple, whose ticker is `AAPL`. You can see the resemblance between the company name and the ticker, right? However, many other symbologies aren't as obvious. You have ones like **SEDOL**, **ISIN**, and **CUSIP**, all combinations of numbers and letters which make no sense to the everyday eye. For example, Apple's SEDOL is `2046251`. Not as clear as `AAPL`, is it? But just knowing that you want to invest in `AAPL` or `2046251` isn't enough to buy it. Apple trades across multiple countries, currencies, and exchanges. Hopefully, this gets you thinking, "How can you uniquely identify the stock that you want to buy?"

<sub>As a quick note, most of this information isn't essential for retail traders - people who trade on their own money in personal accounts. Symbology really matters for applications like high-frequency trading platforms and algorithmic trading that use Smart Order Routing, which we'll touch on later. This article is meant to be informative on some behind-the-scenes logic in the world of stock trading.</sub>

# Exchanges

To begin our dive into uniquely identifying a stock, first, we need to look at something called exchanges. Exchanges are where you go to buy and sell stocks. It's like if you want to buy an old guitar and look for a sale on Facebook Marketplace and Kijiji. The difference between these two options is that they are separate locations to buy/sell, with different people using them. Exchanges follow the same principle: people place orders at a price that they're looking for, and everyone can see those orders. Unlike Kijiji, exchanges let you place a buy order without a known seller, meaning you can view the prices buyers are willing to pay, not just the prices sellers are asking. The current price at which people are attempting to buy and sell is known as the **bid/ask**.  

Let's go through an example scenario to demonstrate why looking at the correct exchange matters.  
You're looking at the stock prices on the **New York Stock Exchange (NYSE)**, and you see that the **bid price** (the price someone would pay you to buy that stock) of a stock you're interested in selling is USD $30. After you place an order, you get a confirmation that you just sold it for $40. You're elated until you realize the fine print. You accidentally sold it on the **Toronto Stock Exchange (TSX)** in CAD, incurring foreign exchange costs too!  

**So, what does this mean?** Just knowing a stock's name isn't enough, as stocks can be sold on multiple exchanges, sometimes even in multiple currencies. The good news: every **ticker** on a given exchange is unique. Some exchanges, such as the TSX, allow the same stock to trade in multiple currencies. For example, a stock can trade in both USD and CAD, with the USD ticker typically followed by `.U` to distinguish it.


<sup><b>Disclaimer: Most people trade stocks through a broker, such as the bank where they hold their primary account. Brokers typically provide consolidated views (using data from many exchanges) on stock prices and don't break them down by exchange. To my knowledge, this level of granularity is only important in trading systems that have to decide which exchange to send an order to. Thus, this example overcomplicates the reality of a retail trader to make a point.</b></sup>

# Uniqueness

Trading systems can operate at the most granular level of stock trading, more so than any other entity. They require precise information on stocks so they can trade them correctly. Why? Because when trading a stock, it can be found:  
- on different exchanges,
- in different countries,
- in different currencies,
- using different **tickers**,  

and more. The trading system only understands the data it is given, so it requires some method of identifying stocks across these differences. Additionally, trading systems can include Smart Order Routers (SORs), which compare prices across exchanges to identify the best place to trade. This is why unique stock symbols are required, as they allow for simple and efficient identification of every stock.  

The **Reuters Instrument Code (RIC)** is an industry-standard identifier that provides each stock a unique, human-readable symbol by combining **tickers** and exchange codes. The **New York Stock Exchange (NYSE)** has the suffix `.N`. For a Canadian exchange, the **Toronto Stock Exchange (TSX)** is known as `.TO`. On the NYSE, Apple is `AAPL.N`, while on the TSX, it is `AAPL.TO`. If Apple traded in USD on the TSX, it would be `AAPLu.TO`, with the `u` signifying the currency. Becoming familiar with stock tickers and exchange codes allows you to quickly recognize a stock by its RIC, hence its "readability".  

The **Financial Instrument Global Identifier (FIGI)** is a less common identifier that has the same property of uniqueness. FIGIs are not readable like RICs. For example, the FIGI for Apple on NYSE is `BBG000B9XVV8`. However, they are just as useful as RIC in a trading system, since the data's readability doesn't matter. A special feature is that no matter what happens, a company's FIGI remains constant. Even if they change their name and ticker due to restructuring, the FIGI stays the same, making it extremely valuable for trading systems where you can trust that your unique identifier is stable. FIGI also contains a hierarchy that provides a "consolidated" view, such as how the stock is trading overall in a country.  

![FIGI Hierarchy Example](./assets/stock_symbology/FIGI_Hierarchy_Example.jpg)

A similar hierarchy exists for RIC, but I can't guarantee that each company always has both a country composite and a global code. A benefit of the hierarchy is that it becomes extremely simple to group stocks of the same company. This is invaluable for companies that have different tickers across exchanges/countries. Because each FIGI is unique and never changes, it ensures that a Global Share Class FIGI can always be used to find all of the Exchange Level FIGIs. It is a durable option that trumps something brittle like the company name or ticker, which can change and is not always consistent across countries.  

To my knowledge, no other code, such as the International Securities Identification Number (ISIN), SEDOL, or CUSIP, has the same properties as RIC and FIGI. While an ISIN uniquely identifies a stock, it cannot identify the exchange on which it was traded. Other symbols, such as the Market Identifier Code (MIC), are used to supplement this information. On the other hand, SEDOL doesn't take currency into account. That is why FIGI is so powerful. It combines all this information that other symbols require new columns for. While each has its own purpose, hopefully you can see why trading systems prefer a single identifier that encapsulates company, exchange, and currency.  

To end this section, let's go through an example. An algorithm wishes to sell Apple in USD. It currently owns 100 shares and wants to sell 10 at the best price to rebalance its position. It takes the following steps:
1. Sends a request to its data provider to fetch the latest price for Apple. It searches for the FIGIs `BBG000B9XVV8` (NYSE) and `BBG000B9Y5X2` (NASDAQ) and is told their prices in USD. (It would also look on any other exchange that Apple is sold on. Omitted for simplicity)
2. Compares the prices and sends an order to the exchange with the highest bid, maximizing their profit from the sale.

To summarize: stocks can vary by country, currency, exchange, and more. A truly "unique" identifier is invaluable to trading systems because they can differentiate a stock listing against all of these variables. Some examples are: RIC, a popular proprietary identifier, and FIGI, a free open-source equivalent.

## Resources
<details>
  <summary>Click to expand</summary>
  
- [Reuters website showing Apple consolidated information for the U.S.](https://www.reuters.com/markets/companies/AAPL.O/)
	- [What does "consolidated" mean in this context?](https://data.nasdaq.com/databases/CQT)
- [Reuters website showing Apple on NASDAQ](https://www.reuters.com/markets/companies/AAPL.OQ) (**note:** when I first wrote this article, Reuters provided a link showing Apple on NYSE. Since, they seem to have removed it, potentially because NYSE is not the primary listing in the U.S. However, Apple still trades on NYSE and can be identified by trading systems as `AAPL.N`)
- [Comprehensive Review of RICs and their structure as well as how to use them in data feeds](https://www.smallake.kr/wp-content/uploads/2017/03/reuters_dataguide.pdf)
- [Great list of exchange suffixes](https://www.onixs.biz/fix-dictionary/4.2/app_c.html), listing each exchange by its full name and the corresponding suffix.
- [Similar list of exchange suffixes for RICs but including any corresponding MICs](https://www.onixs.biz/fix-dictionary/latest/app_6_c.html), the Market Identifier Code to uniquely identify an exchange.
- [Full Reuters codes, including those for indices, benchmarks, bonds, and more](https://www.usek.edu.lb/Content/Assets/20240205WorkspaceWAinstrumentCode.pdf). Exchange Extensions are found at the bottom of page 6.
- [Apple on NYSE]([Search | OpenFIGI](https://www.openfigi.com/search?marketSector=Equity&searchTerms=apple&securityType=Common+Stock&currency=USD&exchangeCode=UN&countryOfIssue=US)), searched through OpenFIGI, a web portal to access all important FIGI information. Shows Apple's FIGI for its NYSE listing.
- [Overview of FIGI](https://www.openfigi.com/about/overview), its benefits, and how it works. Provided by OpenFIGI.
</details>


# What About Bloomberg?
Did you know that Bloomberg never meant to share their identifier? You may remember that I briefly mentioned the Bloomberg identifier in the introduction. This is because all professional traders and even those in adjacent fields have used it before. It has a memorable pattern: for stocks, the formula is typically `Ticker + Country Code + Equity`. An example is `BNS CN Equity`. This identifier is also unique, and I believe they have exchange-level and country-level identifiers, similar to FIGI.  

But why didn't they mean for it to be shared? I previously called Bloomberg's "Symbology Data Guy" while looking for a unique identifier, and he explained why this one would be tough to use in a trading system.  

Originally, Bloomberg also saw the need for a unique identifier for every stock. Wanting something readable, they created their own identifier for internal use. This was a game-changer and eliminated confusion for their staff. Being as useful as it is, a client eventually caught wind of the identifier and wanted to use it too. Bloomberg then began opening it up for use, and it became the default for traders. I can't tell you when they started using it within the Bloomberg Terminal search, but it is now the default. Even though it isn't an official identifier, when a trader wants to look up a stock, they're probably searching for its Bloomberg identifier.  

Fun bit of history! Since it is unofficial, they've included it in some of their data services but not others. I find it extremely interesting as it's the main identifier used in their Terminal now, and it became extremely popular thanks to how readable it is at a glance.  

# Interlisted Stocks
Many stocks are issued in one country and trade only there. However, the TSX publishes a [daily list](https://www.tsx.com/files/trading/interlisted-companies.txt) of stocks that are traded on the TSX and can be "converted" into an equivalent on a U.S. exchange. Cross-listing occurs when stocks have primary listings in two countries and typically applies to Canadian stocks like RBC (Royal Bank of Canada), which are primarily listed on the TSX and on a U.S. exchange like the NYSE.  

For traders, this arrangement means that you can buy a share on the TSX in CAD and then sell it on the NYSE in USD. This grants Canadian stocks access to U.S. capital and introduces interesting side effects. For example, the prices in CAD and USD are effectively tethered because any price difference means someone can make "infinite money" (formally known as "arbitrage") by buying on one exchange, and then selling on the other, where it is worth more thanks to the CAD/USD rate.  

What does this mean for trading algorithms? In our previous example, we only looked at U.S. exchanges. If we were trading RBC's stock, `RY`, our algorithm would look at all exchanges in Canada and the U.S., comparing the prices by using the current CAD/USD rate.  

Foreign exchange rates can also be very important to algorithms. These can trade millions of dollars a day, so small changes in CAD/USD can have massive impacts on profit. Thus, algorithms may want to view their positions in CAD and USD (i.e., the amount of money they have spent in each currency), analyze the CAD/USD rate, and decide the best course of action. One strategy is to minimize exposure. If a company's algorithm has sold heavily in USD but operates in CAD, it may buy USD-denominated stocks to reduce its USD exposure and limit sensitivity to CAD/USD fluctuations. Take the following scenarios into account, where a company has $200 USD and buys a stock:

|                            | Buy in CAD                   | Buy in USD                                                     |
| -------------------------- | ---------------------------- | -------------------------------------------------------------- |
| Their position:            | Has $200 USD remaining       | Has $0 USD remaining                                           |
| If CAD/USD rates increase: | That money is now worth less | They have no exposure, and are thus unaffected by rate changes |
| If CAD/USD rates decrease: | That money is now worth more | They have no exposure, and are thus unaffected by rate changes |

You might notice that retaining USD exposure could allow them to benefit from favourable rate changes. That said, they are equally exposed to losses if rates move the wrong way. However, the rationale behind this approach is to reduce the number of variables at play, simplifying risk management. By eliminating sensitivity to CAD/USD rates, the company can focus on factors within its control and remove exchange rate volatility as a source of uncertainty in its returns.
 
# More About Trading Systems - Fun Stuff
These concepts are adjacent to stock symbology and delve into other concepts relating to trading systems and algorithms. I don't plan on dedicated blog posts for them, but I hope the information is interesting to learn.
## Dark Pools
Dark pools sound really cool (in a comic book fashion-y sense), and I promise they are just as cool as they sound. They allow for secretive trades so no one on the market catches a whiff of your intent. They accomplish this by masking the trading venue to everyone's eyes, including yours.  

Imagine you're a large trading firm that wants to sell a large volume of a stock. If you send your order to the market, you're selling so much that you might move the price against you, losing money. A good example is pension funds. They need to trade large volumes at once and sending that massive order to a regular exchange means that others can exploit their need for so many shares and drive the price per share up. Thus, dark pools.  

In dark pools (or dark venues), no one knows the bid/ask. Every other venue we've discussed is a "lit" venue, meaning anyone can see the offers at which people want to buy/sell. For dark venues, their advantage is that no one knows. You submit an order at a reasonable price based on your goals or the bid/ask in lit venues, but you don't know whether anyone will match your order. If you try to buy in a dark venue, you only know there are sellers once your order fills, meaning your order is completed.  

This is extremely powerful because now you can buy as much as you want without moving the prices in the real market. If... only it were that easy. If you're trying to buy $1000 of Apple, you can't just send $1000 orders to every dark venue. If they are all filled, you've now spent far more than you intended to. Instead, dark pools help find liquidity for your stocks while keeping your trading strategies hidden.  

A common strategy with dark pools is to test the waters. You send a small buy order for $10. If it fills, you know someone is selling. So you send a bit more. And you keep sending until you've bought everything you want to, or no one is selling anymore, at which point you can cancel your order if you'd rather try selling elsewhere. This opens up so many possibilities for trading algorithms, and I believe it is a very cool part of the world of trading.


## Unlisted Trading Privileges
If you're knowledgeable about exchanges, you might be wondering how stocks are traded on exchanges that they aren't listed on. "Listing" is when a company pays an exchange for the right to have its stock traded there. Think of it as paying rent for a storefront. For Apple, its primary listing is NASDAQ, though I use NYSE and TSX in my examples as they relate to well-known cities.  

Unlisted Trading Privileges (UTP) refers to the practice of trading venues allowing traders to buy/sell a stock that is not formally listed on their exchange. Part of this is competition, as no exchange has a monopoly over a certain stock, meaning all exchanges must compete on speed and trading fees. It also provides liquidity, giving more "doors" for trades to enter the market.
