// Import
import { registerSettings } from "./settings.js";

// Base Hooks
Hooks.once("init", () => {
    console.log("5e-custom-currency | Init");

    registerSettings();
});

Hooks.on("ready", function() {
    console.log("5e-custom-currency | Ready");

    patch_currencyNames();
    console.log("5e-custom-currency | patch_currencyNames");
    
    if (fetchParam("depCur"))
    {
        patch_currencyConversion();
        console.log("5e-custom-currency | patch_currencyConversion");
    }
    else {
        console.log("5e-custom-currency | Using Independent Currencies");
        independentCurrency();
    }

});

Hooks.on('renderActorSheet5eCharacter', (sheet, html) => {
    if(!fetchParam("depCur")) {
        removeConvertCurrency(html);
    }

    alterCharacterCurrency(html);
});

const currencyTypes = ["pp", "gp", "ep", "sp", "cp"];
const conversionTypes = ["cp-sp", "sp-ep", "ep-gp", "gp-pp"];

//  Base Functions

const get_conversion_rates = () => conversionTypes.reduce( (rates, type) => {
	rates[type] = fetchParam(type);
	return rates;
}, {});

const fetchParam = paramKey => game.settings.get("5e-custom-currency", paramKey);

const fetchParams = () => currencyTypes.reduce((params, currencyType) => {
	const alt = `${currencyType}Alt`;
	const altAbrv = `${alt}Abrv`
	params[alt] = fetchParam(alt);
	params[altAbrv] = fetchParam(altAbrv);
	return params;
}, {});

export function patch_currencyConversion() {
    const rates = get_conversion_rates();
	conversionTypes.forEach(conversionType => {
		const currencyType = conversionType.slice(0,2);
		const currency = CONFIG.DND5E.currencies[currencyType];
		const each = rates[conversionType];
		const into = conversionType.slice(3);
		// set the conversion if complete, else remove any existing conversion
		if( currency && into && each ){
			currency.conversion = { each, into};
		}
		else if(currency){
			delete currency.conversion;
		}
	});
};

export function patch_currencyNames() {
    const currencies = fetchParams();
	currencyTypes.forEach(currencyType => {
		const currency = CONFIG.DND5E.currencies[currencyType];
		currency.label = currencies[`${currencyType}Alt`];
		currency.abbreviation = currencies[`${currencyType}AltAbrv`];
	});
}

function alterCharacterCurrency(html) {
    let altNames = fetchParams();

	currencyTypes.forEach(type => {
		html.find(`[class="denomination ${type}"]`).text(altNames[`${type}AltAbrv`]);
	});
}

function independentCurrency() {
    CONFIG.Actor.documentClass.prototype.convertCurrency = function () {
    };
}

function removeConvertCurrency(html) {
    html.find('[class="currency-item convert"]').remove();
    html.find('[data-action="convertCurrency"]').remove();
    html.find('[title="Convert Currency"]').remove();
}

// Compatibility: Tidy5E

Hooks.on('renderActorSheet5eNPC', (sheet, html) => {
    if (game.modules.get('tidy5e-sheet')?.active && sheet.constructor.name === 'Tidy5eNPC') {
        alterCharacterCurrency(html);
    }
});

Hooks.on("ready", function() {
    let altNames = fetchParams();

    if (game.modules.get('tidy5e-sheet')?.active) {
        console.log("5e-custom-currency | Altering TIDY5E");
        game.i18n['translations']['TIDY5E']["CurrencyAbbrPP"] = altNames["ppAltAbrv"]
        game.i18n['translations']['TIDY5E']["CurrencyAbbrGP"] = altNames["gpAltAbrv"]
        game.i18n['translations']['TIDY5E']["CurrencyAbbrEP"] = altNames["epAltAbrv"]
        game.i18n['translations']['TIDY5E']["CurrencyAbbrSP"] = altNames["spAltAbrv"]
        game.i18n['translations']['TIDY5E']["CurrencyAbbrCP"] = altNames["cpAltAbrv"]
    }
});

// Compatibility: Let's Trade 5E
Hooks.on('renderTradeWindow', (sheet, html) => {
    alterTradeWindowCurrency(html);
});


Hooks.on('renderDialog', (sheet, html) => {
    if (game.modules.get('5e-custom-currency')?.active && sheet.title === 'Incoming Trade Request') {
        alterTradeDialogCurrency(html);
    }
});

function alterTradeDialogCurrency(html) {
    let altNames = fetchParams();

    const content = html.find('.dialog-content p');
    const match = content.text().match(/.+ is sending you [0-9]+((pp|gp|ep|sp|cp) \.).+/);
    if (match) content.text(content.text().replace(match[1], ' ' + altNames[match[2] + "Alt"] + '.'));
}

function alterTradeWindowCurrency(html) {
    let altNames = fetchParams();

    currencyTypes.forEach(currencyType => {
        const container = html.find('[data-coin="' + currencyType + '"]').parent();
        if (!container.length) return;

        for (const [k, n] of Object.entries(container.contents())) {
            if (n.nodeType === Node.TEXT_NODE) n.remove();
        }

        container.append(' ' + altNames[currencyType + "AltAbrv"]);
        container.attr('title', altNames[currencyType + "Alt"]);
    });
}

// Compatibility: Party Overview

Hooks.on('renderPartyOverviewApp', (sheet, html) => {
    alterPartyOverviewWindowCurrency(html);
});

function alterPartyOverviewWindowCurrency(html) {
    let altNames = fetchParams();

    const currencies = html.find('div[data-tab="currencies"] div.table-row.header div.text.icon')
    $(currencies[0]).text(altNames["ppAlt"])
    $(currencies[1]).text(altNames["gpAlt"])
    $(currencies[2]).text(altNames["epAlt"])
    $(currencies[3]).text(altNames["spAlt"])
    $(currencies[4]).text(altNames["cpAlt"])
    $(currencies[5]).text(`${altNames["gpAlt"]} (${game.i18n.localize('party-overview.TOTAL')})`)
}
