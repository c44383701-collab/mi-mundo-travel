# Reference list: 193 UN members + 2 observer states (VA, PS) = 195
_RAW = """
AL|Albania|EU|41.15|20.17
AD|Andorra|EU|42.55|1.6
AT|Austria|EU|47.52|14.55
BY|Bielorrusia|EU|53.71|27.95
BE|Bélgica|EU|50.5|4.47
BA|Bosnia y Herzegovina|EU|43.92|17.68
BG|Bulgaria|EU|42.73|25.49
HR|Croacia|EU|45.1|15.2
CY|Chipre|EU|35.13|33.43
CZ|Chequia|EU|49.82|15.47
DK|Dinamarca|EU|56.26|9.5
EE|Estonia|EU|58.6|25.01
FI|Finlandia|EU|61.92|25.75
FR|Francia|EU|46.6|2.2
DE|Alemania|EU|51.17|10.45
GR|Grecia|EU|39.07|21.82
HU|Hungría|EU|47.16|19.5
IS|Islandia|EU|64.96|-19.02
IE|Irlanda|EU|53.41|-8.24
IT|Italia|EU|41.87|12.57
LV|Letonia|EU|56.88|24.6
LI|Liechtenstein|EU|47.17|9.55
LT|Lituania|EU|55.17|23.88
LU|Luxemburgo|EU|49.82|6.13
MT|Malta|EU|35.94|14.38
MD|Moldavia|EU|47.41|28.37
MC|Mónaco|EU|43.74|7.42
ME|Montenegro|EU|42.71|19.37
NL|Países Bajos|EU|52.13|5.29
MK|Macedonia del Norte|EU|41.61|21.75
NO|Noruega|EU|60.47|8.47
PL|Polonia|EU|51.92|19.15
PT|Portugal|EU|39.4|-8.22
RO|Rumanía|EU|45.94|24.97
RU|Rusia|EU|61.52|105.32
SM|San Marino|EU|43.94|12.46
RS|Serbia|EU|44.02|21.01
SK|Eslovaquia|EU|48.67|19.7
SI|Eslovenia|EU|46.15|14.99
ES|España|EU|40.46|-3.75
SE|Suecia|EU|60.13|18.64
CH|Suiza|EU|46.82|8.23
UA|Ucrania|EU|48.38|31.17
GB|Reino Unido|EU|55.38|-3.44
VA|Ciudad del Vaticano|EU|41.9|12.45
AF|Afganistán|AS|33.94|67.71
AM|Armenia|AS|40.07|45.04
AZ|Azerbaiyán|AS|40.14|47.58
BH|Baréin|AS|26.07|50.56
BD|Bangladés|AS|23.68|90.36
BT|Bután|AS|27.51|90.43
BN|Brunéi|AS|4.54|114.73
KH|Camboya|AS|12.57|104.99
CN|China|AS|35.86|104.2
GE|Georgia|AS|42.32|43.36
IN|India|AS|20.59|78.96
ID|Indonesia|AS|-0.79|113.92
IR|Irán|AS|32.43|53.69
IQ|Irak|AS|33.22|43.68
IL|Israel|AS|31.05|34.85
JP|Japón|AS|36.2|138.25
JO|Jordania|AS|30.59|36.24
KZ|Kazajistán|AS|48.02|66.92
KW|Kuwait|AS|29.31|47.48
KG|Kirguistán|AS|41.2|74.77
LA|Laos|AS|19.86|102.5
LB|Líbano|AS|33.85|35.86
MY|Malasia|AS|4.21|101.98
MV|Maldivas|AS|3.2|73.22
MN|Mongolia|AS|46.86|103.85
MM|Birmania|AS|21.91|95.96
NP|Nepal|AS|28.39|84.12
KP|Corea del Norte|AS|40.34|127.51
OM|Omán|AS|21.51|55.92
PK|Pakistán|AS|30.38|69.35
PS|Palestina|AS|31.95|35.23
PH|Filipinas|AS|12.88|121.77
QA|Catar|AS|25.35|51.18
SA|Arabia Saudí|AS|23.89|45.08
SG|Singapur|AS|1.35|103.82
KR|Corea del Sur|AS|35.91|127.77
LK|Sri Lanka|AS|7.87|80.77
SY|Siria|AS|34.8|38.997
TJ|Tayikistán|AS|38.86|71.28
TH|Tailandia|AS|15.87|100.99
TL|Timor Oriental|AS|-8.87|125.73
TR|Turquía|AS|38.96|35.24
TM|Turkmenistán|AS|38.97|59.56
AE|Emiratos Árabes Unidos|AS|23.42|53.85
UZ|Uzbekistán|AS|41.38|64.59
VN|Vietnam|AS|14.06|108.28
YE|Yemen|AS|15.55|48.52
DZ|Argelia|AF|28.03|1.66
AO|Angola|AF|-11.2|17.87
BJ|Benín|AF|9.31|2.32
BW|Botsuana|AF|-22.33|24.68
BF|Burkina Faso|AF|12.24|-1.56
BI|Burundi|AF|-3.37|29.92
CV|Cabo Verde|AF|16.0|-24.01
CM|Camerún|AF|7.37|12.35
CF|República Centroafricana|AF|6.61|20.94
TD|Chad|AF|15.45|18.73
KM|Comoras|AF|-11.88|43.87
CG|República del Congo|AF|-0.23|15.83
CD|República Democrática del Congo|AF|-4.04|21.76
CI|Costa de Marfil|AF|7.54|-5.55
DJ|Yibuti|AF|11.83|42.59
EG|Egipto|AF|26.82|30.8
GQ|Guinea Ecuatorial|AF|1.65|10.27
ER|Eritrea|AF|15.18|39.78
SZ|Esuatini|AF|-26.52|31.47
ET|Etiopía|AF|9.15|40.49
GA|Gabón|AF|-0.8|11.61
GM|Gambia|AF|13.44|-15.31
GH|Ghana|AF|7.95|-1.02
GN|Guinea|AF|9.95|-9.7
GW|Guinea-Bisáu|AF|11.8|-15.18
KE|Kenia|AF|-0.02|37.91
LS|Lesoto|AF|-29.61|28.23
LR|Liberia|AF|6.43|-9.43
LY|Libia|AF|26.34|17.23
MG|Madagascar|AF|-18.77|46.87
MW|Malaui|AF|-13.25|34.3
ML|Malí|AF|17.57|-4.0
MR|Mauritania|AF|21.01|-10.94
MU|Mauricio|AF|-20.35|57.55
MA|Marruecos|AF|31.79|-7.09
MZ|Mozambique|AF|-18.67|35.53
NA|Namibia|AF|-22.96|18.49
NE|Níger|AF|17.61|8.08
NG|Nigeria|AF|9.08|8.68
RW|Ruanda|AF|-1.94|29.87
ST|Santo Tomé y Príncipe|AF|0.19|6.61
SN|Senegal|AF|14.5|-14.45
SC|Seychelles|AF|-4.68|55.49
SL|Sierra Leona|AF|8.46|-11.78
SO|Somalia|AF|5.15|46.2
ZA|Sudáfrica|AF|-30.56|22.94
SS|Sudán del Sur|AF|6.88|31.31
SD|Sudán|AF|12.86|30.22
TZ|Tanzania|AF|-6.37|34.89
TG|Togo|AF|8.62|0.82
TN|Túnez|AF|33.89|9.54
UG|Uganda|AF|1.37|32.29
ZM|Zambia|AF|-13.13|27.85
ZW|Zimbabue|AF|-19.02|29.15
AG|Antigua y Barbuda|AM|17.06|-61.8
AR|Argentina|AM|-38.42|-63.62
BS|Bahamas|AM|25.03|-77.4
BB|Barbados|AM|13.19|-59.54
BZ|Belice|AM|17.19|-88.5
BO|Bolivia|AM|-16.29|-63.59
BR|Brasil|AM|-14.24|-51.93
CA|Canadá|AM|56.13|-106.35
CL|Chile|AM|-35.68|-71.54
CO|Colombia|AM|4.57|-74.3
CR|Costa Rica|AM|9.75|-83.75
CU|Cuba|AM|21.52|-77.78
DM|Dominica|AM|15.41|-61.37
DO|República Dominicana|AM|18.74|-70.16
EC|Ecuador|AM|-1.83|-78.18
SV|El Salvador|AM|13.79|-88.9
GD|Granada|AM|12.26|-61.6
GT|Guatemala|AM|15.78|-90.23
GY|Guyana|AM|4.86|-58.93
HT|Haití|AM|18.97|-72.29
HN|Honduras|AM|15.2|-86.24
JM|Jamaica|AM|18.11|-77.3
MX|México|AM|23.63|-102.55
NI|Nicaragua|AM|12.87|-85.21
PA|Panamá|AM|8.54|-80.78
PY|Paraguay|AM|-23.44|-58.44
PE|Perú|AM|-9.19|-75.02
KN|San Cristóbal y Nieves|AM|17.36|-62.78
LC|Santa Lucía|AM|13.91|-60.98
VC|San Vicente y las Granadinas|AM|12.98|-61.29
SR|Surinam|AM|3.92|-56.03
TT|Trinidad y Tobago|AM|10.69|-61.22
US|Estados Unidos|AM|37.09|-95.71
UY|Uruguay|AM|-32.52|-55.77
VE|Venezuela|AM|6.42|-66.59
AU|Australia|OC|-25.27|133.78
FJ|Fiyi|OC|-17.71|178.07
KI|Kiribati|OC|-3.37|-168.73
MH|Islas Marshall|OC|7.13|171.18
FM|Micronesia|OC|7.43|150.55
NR|Nauru|OC|-0.52|166.93
NZ|Nueva Zelanda|OC|-40.9|174.89
PW|Palaos|OC|7.51|134.58
PG|Papúa Nueva Guinea|OC|-6.31|143.96
WS|Samoa|OC|-13.76|-172.1
SB|Islas Salomón|OC|-9.65|160.16
TO|Tonga|OC|-21.18|-175.2
TV|Tuvalu|OC|-7.11|177.65
VU|Vanuatu|OC|-15.38|166.96
"""

CONTINENTS = {
    "EU": "Europa",
    "AS": "Asia",
    "AF": "África",
    "AM": "América",
    "OC": "Oceanía",
}

COUNTRIES = []
for _line in _RAW.strip().splitlines():
    _code, _name, _cont, _lat, _lng = _line.split("|")
    COUNTRIES.append({"code": _code, "name": _name, "continent": _cont, "lat": float(_lat), "lng": float(_lng)})

COUNTRY_BY_CODE = {c["code"]: c for c in COUNTRIES}
TOTAL_COUNTRIES = len(COUNTRIES)
CONTINENT_TOTALS = {k: sum(1 for c in COUNTRIES if c["continent"] == k) for k in CONTINENTS}

assert TOTAL_COUNTRIES == 195, TOTAL_COUNTRIES
