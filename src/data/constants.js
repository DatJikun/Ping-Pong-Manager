window.PPM = window.PPM || {};
const COUNTRIES = {
  PL: {
    id:'PL', name:'Polska', peakAgeBand:[27,32], flag:'\ud83c\uddf5\ud83c\uddf1',
    budgetMult:1.0, ovrMult:1.0, currency:'€',
    l1Names:['Rakieta Wrocław','Topspin Gdańsk','Kontra Kraków','Serwis Poznań','Bystrzyca Lublin','Nadwiślan Toruń','Halny Nowy Sącz','Karpaty Krosno','Gryfit Szczecin','Wichr Katowice','Sokolik Grodzisk','Piorun Łódź'],
    l2Names:['Akademia Orłów','Rotacja Bydgoszcz','Sygnał Białystok','Kadet Mielec','Aksamit Kielce','Bałtyk Gdynia','Rekord Bielsko','Iskrzyca Zamość','Tempo Rzeszów','Podlasianka Łomża','Olimpik Opole','Zryw Siedlce'],
    firstNames:['Marek','Tomasz','Pawe\u0142','Micha\u0142','Krzysztof','Piotr','Jakub','\u0141ukasz','Kamil','Adam','Rafa\u0142','Bartosz','Maciej','Grzegorz','Szymon','Wojciech','Dawid','Rados\u0142aw','Sebastian','Mateusz','Damian','Artur','Przemys\u0142aw','Mariusz','Dariusz','Marcin','Konrad','Patryk','Karol','Robert','Filip','Igor','Wiktor','Oskar','Norbert','Adrian','Kacper','Hubert','Dominik','Mi\u0142osz','Jan','Antoni','Aleksander','Maksymilian','Franciszek','Leon','Miko\u0142aj','Stanis\u0142aw','Tymon','Cezary','Arkadiusz','B\u0142a\u017cej','Emil','Jerzy','Kazimierz','Nikodem','Olaf','Remigiusz','Tadeusz','Wac\u0142aw','Anatol','Borys','Cyprian','Eryk','Felicjan','Gustaw','Henryk','Ireneusz','Juliusz','Kornel','Lucjan','Marcel','Natan','Olgierd','Radomir','Seweryn','Teodor','Witold','Zenon','Bruno','Kajetan','J\u0119drzej','Bogumi\u0142','Dobromir','Alojzy','Miron','Ksawery','Roman','Jaros\u0142aw','Tobiasz','Klemens','Mieczys\u0142aw','Roch','Beniamin','Szczepan','Tytus','Wszebor'],
    lastNames:['Kowalski','Wi\u015bniewski','Zaj\u0105c','Duda','Lewandowski','Nowak','W\u00f3jcik','Kami\u0144ski','Krawczyk','Piotrowski','Grabowski','Michalski','Mazur','Jankowski','Wo\u017aniak','Kaczmarek','Szyma\u0144ski','Pawlak','Marciniak','Kowalczyk','Jab\u0142o\u0144ski','Zieli\u0144ski','Kwiatkowski','Wr\u00f3bel','Walczak','Lis','Kot','Szczepa\u0144ski','Zawadzki','Adamski','Baran','B\u0105k','Czerwi\u0144ski','D\u0105browski','Gajewski','Laskowski','Malinowski','Sadowski','Urba\u0144ski','Bednarek','Brzezi\u0144ski','Chmielewski','Cie\u015blak','Dudek','G\u0142owacki','Kalinowski','Kope\u0107','Kr\u00f3l','Majewski','Milewski','Ostrowski','Rutkowski','Sawicki','Sikora','Tomaszewski','Wilk','W\u0142odarczyk','Zakrzewski','\u017bak','Borkowski','Czarny','Drozd','Falkowski','G\u00f3rny','Jagie\u0142\u0142o','Kurek','Musia\u0142','Niedzielski','Owczarek','Pietrzak','Rosi\u0144ski','Szulc','Turek','Wasilewski','Zar\u0119ba','Brodzki','Cichocki','Kwiecie\u0144','Mroczek','Paku\u0142a','Skowron','Tomczak','Ulatowski','Wysocki','Zborowski','Brodziak','Mularczyk','Polak','Rogowski','Socha','Tracz','Wrona','Zawisza','Bia\u0142ek','Jurek','Kozak','P\u0142atek'],
    nationalTeam:'Reprezentacja Polski',
    worldRank:8,
  },
  DE: {
    id:'DE', name:'Niemcy', peakAgeBand:[27,32], flag:'\ud83c\udde9\ud83c\uddea',
    budgetMult:2.2, ovrMult:1.18,
    l1Names:['Rheinpuls Düsseldorf','Bergfalken Köln','Elbstern Hamburg','Mainbogen Frankfurt','Saarspin Saarbrücken','Havelkraft Berlin','Isarblitz München','Ruhrwelle Essen','Neckar Kontra Stuttgart','Weser Topspin Bremen','Taunus Rally Wiesbaden','Alpenflug Augsburg'],
    l2Names:['Nordlicht Kiel','Domstadt Aachen','Schwarzwald Freiburg','Spreebogen Potsdam','Emsland Spin Münster','Donaukraft Regensburg','Harzschlag Goslar','Moselstern Trier','Erzgebirge Rally Chemnitz','Bodensee Konstanz','Heidefalken Hannover','Rheintal Mainz'],
    firstNames:['Thomas','Michael','Andreas','Stefan','Markus','Christian','Martin','Klaus','Frank','Peter','J\u00fcrgen','Wolfgang','Hans','Dieter','Rainer','Karl','Bernd','Uwe','Horst','Werner','Lukas','Felix','Jonas','Leon','Tim','Julian','Maximilian','Finn','Niklas','Moritz','Tobias','Dominik','Florian','Matthias','Nico','Fabian','Daniel','Alexander','Bastian','Philipp','Johannes','Anton','David','Noah','Samuel','Benedikt','Vincent','Lennart','Patrick','Henning','Sascha','Ole','Kai','Sebastian','Marius','Dennis','Roman','Erik','Konrad','Timo'],
    lastNames:['M\u00fcller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Sch\u00e4fer','Koch','Bauer','Richter','Klein','Wolf','Schr\u00f6der','Neumann','Schwarz','Zimmermann','Braun','Kr\u00fcger','Hartmann','Lange','Werner','Schmitz','Meier','Krause','Lehmann','Schmid','Schulze','Maier','K\u00f6hler','Herrmann','K\u00f6nig','Walter','Mayer','Huber','Kaiser','Fuchs','Peters','Lang','Scholz','M\u00fcller','J\u00e4ger','Wei\u00df','Jung','Keller','Hahn','Lorenz','Bergmann','Albrecht','Franke','Busch','Voigt','Kramer','Dietrich','Arnold','Seidel','Fr\u00f6hlich'],
    nationalTeam:'Nationalmannschaft',
    worldRank:3,
  },
  CN: {
    id:'CN', name:'Chiny', peakAgeBand:[21,26], flag:'\ud83c\udde8\ud83c\uddf3',
    budgetMult:3.5, ovrMult:1.35,
    l1Names:['Beijing Red Crane','Shanghai Pearl Spin','Guangzhou Jade River','Shenzhen Sky Serve','Chengdu Golden Panda','Wuhan Lake Rally','Nanjing Azure Wall','Tianjin Harbor Loop','Hangzhou Silk Arc','Chongqing Mountain Fire','Qingdao Ocean Blade','Xi’an Terra Warriors'],
    l2Names:['Suzhou Garden Spin','Ningbo Wave Riders','Dalian North Star','Xiamen Island Loop','Kunming Cloud Peak','Changsha Ember Rally','Jinan Spring City','Harbin Ice Arc','Fuzhou Banyan Club','Zhengzhou Central Serve','Shijiazhuang Stone Gate','Nanning Green Wave'],
    firstNames:['Wei','Fang','Chao','Long','Jian','Ming','Lei','Hao','Kai','Feng','Tao','Jun','Bo','Yang','Zhe','Peng','Xu','Dong','Rui','Lin','Qiang','Yong','Tian','Shuo','Haoran','Zhiyuan','Jie','Bin','Yichen','Guang','Jin','Shen','Yifan','Xun','Yuan','Cheng','Hong','Xin','Zhen','Yun','An','Bao','Cen','Dawei','Enlai','Guoliang','Han','Junjie','Ke','Liren','Ning','Pei','Qin','Sheng','Teng','Wenhao','Xiang','Yuze','Zimo','Zhikai'],
    lastNames:['Zhang','Wang','Li','Liu','Chen','Yang','Zhao','Huang','Wu','Zhou','Xu','Sun','Ma','Hu','Zhu','Guo','Lin','He','Gao','Luo','Deng','Fang','Jiang','Cao','Yuan','Pan','Tang','Xie','Shen','Han','Lu','Wei','Feng','Yu','Dong','Xiao','Cheng','Ye','Su','Peng','Hong','Cui','Zeng','Tian','Qian','Yan','Du','Fan','Hou','Jin','Kong','Meng','Qiu','Ren','Shao','Tao','Wen','Xiong','Yin','Zou'],
    nationalTeam:'Zh\u014dnggu\u00f3 Du\u00ec',
    worldRank:1,
  },
  JP: {
    id:'JP', name:'Japonia', peakAgeBand:[21,26], flag:'\ud83c\uddef\ud83c\uddf5',
    budgetMult:2.8, ovrMult:1.22,
    l1Names:['Tokyo Hikari','Osaka Storm Loop','Nagoya Kintsugi','Yokohama Bay Spin','Kyoto Red Maple','Fukuoka Wave','Kobe Harbor Arc','Sendai Blue Forest','Hiroshima Rising Sun','Saitama Thunder','Chiba Sky Rally','Sapporo Snow Fox'],
    l2Names:['Niigata Rice Field','Matsuyama Orange Club','Okayama Peach Spin','Kumamoto Firebird','Kagoshima Ash Cloud','Naha Coral Serve','Aomori Frost Loop','Kanazawa Gold Leaf','Shizuoka Fuji Arc','Nara White Deer','Takamatsu Island Rally','Nagasaki Harbor Light'],
    firstNames:['Yuki','Haruto','Sota','Hayato','Yuto','Riku','Kai','Ren','Ryota','Takumi','Shun','Kento','Daiki','Naoki','Yusuke','Tatsuya','Masaya','Hiroto','Kazuki','Tomoki','Sora','Itsuki','Minato','Koki','Sho','Taiga','Kosei','Toma','Ryusei','Keita','Haruki','Soma','Rin','Aoi','Kaito','Akito','Asahi','Chihiro','Eita','Fumiya','Genki','Hinata','Issei','Junpei','Kohei','Makoto','Noboru','Reo','Shota','Yamato','Yoshiki','Taichi','Yuu','Masato','Noriaki','Seiya','Takeru','Yoshiro','Zen','Yuya'],
    lastNames:['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto','Inoue','Kimura','Hayashi','Shimizu','Ogawa','Ishikawa','Nakajima','Hasegawa','Abe','Ikeda','Hashimoto','Ishii','Yamashita','Mori','Fujita','Okada','Goto','Hara','Murakami','Kondo','Ishida','Sakamoto','Endo','Aoki','Fukuda','Miura','Nakai','Ueda','Sugiyama','Nishimura','Ando','Takeuchi','Kaneko','Tamura','Fujii','Ono','Maruyama','Kudou','Shibata','Kawasaki','Okamoto','Tsuchiya','Nagata','Kishimoto','Mizuno'],
    nationalTeam:'Nihon Daihyo',
    worldRank:4,
  },
  SE: {
    id:'SE', name:'Szwecja', peakAgeBand:[27,32], flag:'\ud83c\uddf8\ud83c\uddea',
    budgetMult:1.6, ovrMult:1.05,
    l1Names:['Stockholm Nordljus','Göteborg Harbor Spin','Malmö Öresund Rally','Uppsala Crown Serve','Umeå Birch Loop','Luleå Arctic Arc','Västerås Lakefire','Örebro Black Pine','Linköping Skyforge','Jönköping Vättern Wave','Halmstad Coastline','Sundsvall Northwind'],
    l2Names:['Gävle Iron Bay','Borås Loom Spin','Kalmar Castle Loop','Växjö Glass Arc','Karlstad Sun Rally','Eskilstuna Forge','Norrköping River Serve','Helsingborg Sound Wave','Falun Copper Club','Skövde Tableguard','Kiruna Polar Spin','Visby Island Arc'],
    firstNames:['Erik','Lars','Karl','Anders','Johan','Henrik','Per','Magnus','Stefan','Jonas','David','Peter','Mikael','Jan','Kristoffer','Patrik','Andreas','Bj\u00f6rn','Mattias','Linus','Emil','Viktor','Oscar','Anton','Filip','Axel','Gustav','Hugo','Ludvig','Nils','Robin','Adam','Albin','Dennis','Elias','Fabian','Glenn','Isak','Jesper','Kasper','Love','Melker','Niklas','Olle','Pontus','Rasmus','Simon','Tobias','Valter','William','Arvid','Daniel','Fredrik','Gunnar','Hannes','Joakim','Kalle','Leo','Martin','Sebbe'],
    lastNames:['Andersson','Johansson','Karlsson','Nilsson','Eriksson','Larsson','Olsson','Persson','Svensson','Gustafsson','Pettersson','Jonsson','Jansson','Hansson','Bengtsson','J\u00f6nsson','Lindstr\u00f6m','Jakobsson','Magnusson','Olofsson','Lundberg','Berg','Lindgren','Lundqvist','Bergstr\u00f6m','Axelsson','Berglund','Lindholm','Eklund','Sandberg','Sj\u00f6berg','Nystr\u00f6m','Holm','Danielsson','Hellstr\u00f6m','Forsberg','Engstr\u00f6m','Str\u00f6m','Sundberg','\u00d6berg','Blomqvist','Norberg','Edlund','\u00c5hman','Dahlberg','Lindqvist','Ros\u00e9n','S\u00f6derberg','Westin','Wikstr\u00f6m','Bj\u00f6rklund','Ekstr\u00f6m','Fransson','M\u00e5rtensson','Viklund','Holmgren','N\u00e4slund','T\u00f6rnqvist','\u00c5kesson','Hedlund'],
    nationalTeam:'Sveriges Landslag',
    worldRank:6,
  },
  KR: {
    id:'KR', name:'Korea', peakAgeBand:[21,26], flag:'\ud83c\uddf0\ud83c\uddf7',
    budgetMult:2.0, ovrMult:1.12,
    l1Names:['Seoul Hanul Spin','Busan Harbor Wave','Incheon Sky Arc','Daegu Firebird','Daejeon Science Rally','Gwangju Light Serve','Ulsan Blue Forge','Suwon Fortress Loop','Pohang Iron Coast','Jeonju Hanok Club','Changwon Green Blade','Jeju Wind Riders'],
    l2Names:['Goyang Starfield','Anyang Ridge Spin','Seongnam River Arc','Bucheon Bloom Rally','Cheonan Sky Serve','Gumi Silk Loop','Chuncheon Lake Wind','Jinju Lantern Club','Andong Mask Spin','Mokpo Southern Wave','Gangneung Sunrise Arc','Wonju Mountain Rally'],
    firstNames:['Minjun','Seojun','Dohyun','Junho','Juwon','Taehoon','Hyunwoo','Gunwoo','Yujin','Jaemin','Seungwoo','Dongwoo','Minseok','Jihoon','Woobin','Soohyun','Kyungjin','Sangwoo','Jaehyun','Yoonsoo','Jiho','Minjae','Hyeonjun','Siwoo','Eunho','Taeyang','Seungmin','Jisung','Kyuhyun','Yejun','Taemin','Byungho','Chanwoo','Daesung','Eunwoo','Hojin','Inho','Jongsu','Kihyun','Minho','Namjun','Sungmin','Taegyu','Ujin','Wonjun','Yeongho','Youngmin','Jinhwan','Seungho','Doyun','Hoseok','Joon','Kwanwoo','Minseong','Sihun','Taewoo','Woojin','Yongho','Junseok','Seonho'],
    lastNames:['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Shin','Kwon','Hwang','Ahn','Song','Yu','Hong','Ko','Moon','Baek','Heo','Nam','Jeon','Seo','Bae','Cha','Noh','Ha','Sim','Ryu','Jeong','Jin','Min','An','Byeon','Gwak','Gu','Im','Ma','Na','Ra','Son','Yang','Yeo','Yim','Jo','Chu','Do','Gang','Go','Kuk','Seol','Tak','Won','Wi','Yeom','Byeong','Pyo'],
    nationalTeam:'Daehan Minguk',
    worldRank:5,
  }
};

const COUNTRY_IDS = Object.keys(COUNTRIES);


// v16: Loan system
// Players on loan: {playerId, toLoanTeamId, fromTeamId, seasons:1}

// v16: Records
const RECORDS_KEYS = {
  PERFECT_SEASON: {id:'PERFECT_SEASON', label:'Perfekcyjny Sezon', desc:'22 z 22 mo\u017cliwych punkt\u00f3w (66 pkt)'},
  LONGEST_STREAK: {id:'LONGEST_STREAK', label:'Najd\u0142u\u017csza Seria', desc:'Kolejek bez pora\u017cki z rz\u0119du'},
  FEWEST_SETS_LOST: {id:'FEWEST_SETS_LOST', label:'Najmniej Straconych Set\u00f3w', desc:'W jednym sezonie'},
  MOST_WINS_PLAYER: {id:'MOST_WINS_PLAYER', label:'Najwi\u0119cej Wygranych', desc:'Przez jednego gracza w sezonie'},
  HIGHEST_OVR: {id:'HIGHEST_OVR', label:'Najwy\u017cszy OVR w Historii', desc:'Peak OVR osi\u0105gni\u0119ty przez zawodnika'},
  MOST_MVP: {id:'MOST_MVP', label:'Najwi\u0119cej Nagr\u00f3d MVP', desc:'MVP kolejki w historii gry'},
};

const TRAITS={
  IRON_ATTACK:{id:'IRON_ATTACK',label:'\u017belazny Atak',type:'atk',desc:'ATK dominuje ponad inne statystyki. Bonus +ATK w ka\u017cdym meczu.'},
  IRON_DEFENSE:{id:'IRON_DEFENSE',label:'Mur Obronny',type:'def',desc:'Mocny bekhend i blok. Trudny do przebicia.'},
  SERVE_MASTER:{id:'SERVE_MASTER',label:'Mistrz Serwu',type:'srv',desc:'SRV dominuje. Prze\u0142amuje rywala serwem.'},
  STEEL_NERVES:{id:'STEEL_NERVES',label:'Stalowe Nerwy',type:'men',desc:'MEN bardzo wysoki, odporny na presj\u0119 i zm\u0119czenie.'},
  LONGEVITY:{id:'LONGEVITY',label:'D\u0142ugowieczny',type:'age',desc:'Wolniejszy spadek formy po osi\u0105gni\u0119ciu szczytu kariery.'},
  WUNDERKIND:{id:'WUNDERKIND',label:'Wunderkind',type:'youth',desc:'Szybki wzrost do 23 roku \u017cycia. Ukrywa wysoki peakOVR.'},
  VETERAN:{id:'VETERAN',label:'Weteran',type:'men',desc:'Do\u015bwiadczony gracz. MEN wysoki, wolny spadek formy.'},
  AGGR_SERVE:{id:'AGGR_SERVE',label:'Agresywny Serwis',type:'srv',desc:'+ATK i +SRV przy serwisie, ale ryzyko niewymuszonego b\u0142\u0119du.'},
  COMEBACK_KID:{id:'COMEBACK_KID',label:'Comeback Kid',type:'men',desc:'Silniejszy gdy przegrywa sety i w decyduj\u0105cym secie.'},
  IRON_STAMINA:{id:'IRON_STAMINA',label:'\u017belazna Kondycja',type:'cond',desc:'Rzadziej kontuzjowany. Zm\u0119czenie ro\u015bnie wolniej.'},
  TACTICIAN:{id:'TACTICIAN',label:'Taktyk',type:'def',desc:'Przy wyr\u00f3wnanym poziomie unika b\u0142\u0119d\u00f3w i czyta gr\u0119.'},
  HOTHEADED:{id:'HOTHEADED',label:'Gor\u0105ca G\u0142owa',type:'atk',desc:'+ATK gdy prowadzi w setach; po przegranym secie spada MEN.'},
  AMBITNY:{id:'AMBITNY',label:'Ambitny',type:'men',desc:'Nie chce gra\u0107 poni\u017cej swojego poziomu i oczekuje topowego projektu.'},
  // 2026-07 goal batch — new match/growth traits (males-only leagues)
  FAST_FEET:{id:'FAST_FEET',label:'Szybkie Nogi',type:'cond',desc:'Lepsza praca n\u00f3g i obrona w d\u0142ugich wymianach; wolniejszy spadek staminy w meczu.'},
  SPIN_WIZARD:{id:'SPIN_WIZARD',label:'Czarownik Rotacji',type:'srv',desc:'Wi\u0119cej b\u0142\u0119d\u00f3w u rywala i mocniejszy serwis/rotacja.'},
  WALL:{id:'WALL',label:'\u015aciana',type:'def',desc:'Bardzo trudny do przebicia — podnosi DEF i obni\u017ca b\u0142\u0105d w\u0142asny.'},
  CLUTCH:{id:'CLUTCH',label:'Clutch',type:'men',desc:'W ko\u0144c\u00f3wkach set\u00f3w (9+) gra ponad poziom — MEN/ATK w clutchu.'},
  MENTOR:{id:'MENTOR',label:'Mentor',type:'youth',desc:'Przy\u015bpiesza rozw\u00f3j m\u0142odszych koleg\u00f3w z \u0142awki (sparring/wzrost).'},
  BIG_MATCH:{id:'BIG_MATCH',label:'Zwierz\u0119 Meczowe',type:'men',desc:'Lepsza forma w pucharach i decyduj\u0105cych starciach (morale/MEN).'},
};

// Realistic table-tennis attributes (owner rework). fh/bh = forehand/backhand attack,
// srv = serve, ret = receive, foot = footwork/speed (physical), men = tactics/nerve.
const SK=['fh','bh','srv','ret','foot','men'];

const SL={fh:'FH',bh:'BH',srv:'SRV',ret:'RET',foot:'FOOT',men:'MEN'};
const SFULL={fh:'Forhend',bh:'Bekhend',srv:'Serwis',ret:'Return',foot:'Praca nóg',men:'Głowa'};

const FN=['Marek','Tomasz','Pawe\u0142','Micha\u0142','Krzysztof','Piotr','Jakub','\u0141ukasz','Kamil','Adam',
 'Rafa\u0142','Bartosz','Maciej','Grzegorz','Szymon','Wojciech','Dawid','Rados\u0142aw','Sebastian','Mateusz',
 'Damian','Artur','Przemys\u0142aw','Mariusz','Dariusz','Marcin','Konrad','Patryk','Karol','Robert',
 'Filip','Igor','Wiktor','Oskar','Norbert','Adrian','Kacper','Hubert','Dominik','Mi\u0142osz',
 'Jan','Antoni','Aleksander','Maksymilian','Franciszek','Leon','Miko\u0142aj','Stanis\u0142aw','Tymon','Cezary',
 'Arkadiusz','B\u0142a\u017cej','Emil','Jerzy','Kazimierz','Nikodem','Olaf','Remigiusz','Tadeusz','Wac\u0142aw',
 'Anatol','Borys','Cyprian','Eryk','Felicjan','Gustaw','Henryk','Ireneusz','Juliusz','Kornel',
 'Lucjan','Marcel','Natan','Olgierd','Radomir','Seweryn','Teodor','Witold','Zenon','Bruno',
 'Kajetan','J\u0119drzej','Bogumi\u0142','Dobromir','Alojzy','Miron','Ksawery','Roman','Jaros\u0142aw','Tobiasz',
 'Klemens','Mieczys\u0142aw','Roch','Beniamin','Szczepan','Tytus','Wszebor','Alan','Cyryl','Edward',
 'Fabian','Gerard','Hieronim','Ignacy','Joachim','Leszek','Mateo','Nestor','Oktawian','Przemko',
 'Rufin','S\u0142awomir','Tymoteusz','W\u0142adys\u0142aw','Ziemowit','Milan','Oliwier'];

const LN=['Kowalski','Wi\u015bniewski','Zaj\u0105c','Duda','Lewandowski','Nowak','W\u00f3jcik','Kami\u0144ski','Krawczyk','Piotrowski',
 'Grabowski','Michalski','Mazur','Jankowski','Wo\u017aniak','Kaczmarek','Szyma\u0144ski','Pawlak','Marciniak','Kowalczyk',
 'Jab\u0142o\u0144ski','Zieli\u0144ski','Kwiatkowski','Wr\u00f3bel','Walczak','Lis','Kot','Szczepa\u0144ski','Zawadzki',
 'Adamski','Baran','B\u0105k','Czerwi\u0144ski','D\u0105browski','Gajewski','Laskowski','Malinowski','Sadowski','Urba\u0144ski',
 'Bednarek','Brzezi\u0144ski','Chmielewski','Cie\u015blak','Dudek','G\u0142owacki','Kalinowski','Kope\u0107','Kr\u00f3l','Majewski',
 'Milewski','Ostrowski','Rutkowski','Sawicki','Sikora','Tomaszewski','Wilk','W\u0142odarczyk','Zakrzewski','\u017bak',
 'Bielski','Czajka','Doma\u0144ski','G\u00f3rski','Ko\u0142odziej','Matusiak','Rybak','Sobczak','Wieczorek','Zieli\u0144ski',
 'Borkowski','Czarny','Drozd','Falkowski','G\u00f3rny','Jagie\u0142\u0142o','Kurek','Musia\u0142','Niedzielski','Owczarek',
 'Pietrzak','Rosi\u0144ski','Szulc','Turek','Wasilewski','Zar\u0119ba','Brodzki','Cichocki','Kwiecie\u0144','Mroczek',
 'Paku\u0142a','Skowron','Tomczak','Ulatowski','Wysocki','Zborowski','Brodziak','Mularczyk','Polak','Rogowski',
 'Socha','Tracz','Wrona','Zawisza','Bia\u0142ek','Jurek','Kozak','P\u0142atek','Kruk','Kraszewski',
 '\u0141api\u0144ski','M\u0142ynarczyk','Nowicki','Piekarski','Sroka','Szczepanik','\u015awi\u0105tek','Weso\u0142owski','\u017bebrowski','\u017buraw'];

const TNAMES_L1=['Rakieta Wrocław','Topspin Gdańsk','Kontra Kraków','Serwis Poznań','Bystrzyca Lublin','Nadwiślan Toruń',
 'Halny Nowy Sącz','Karpaty Krosno','Gryfit Szczecin','Wichr Katowice','Sokolik Grodzisk','Piorun Łódź'];

const TNAMES_L2=['Akademia Orłów','Rotacja Bydgoszcz','Sygnał Białystok','Kadet Mielec','Aksamit Kielce','Bałtyk Gdynia',
 'Rekord Bielsko','Iskrzyca Zamość','Tempo Rzeszów','Podlasianka Łomża','Olimpik Opole','Zryw Siedlce'];

// Special club identities (Layer 2 club traits). Keyed by club name; applied at
// new-game creation and shown on the start screen. The challenge club starts
// near-broke and may only build through its OWN academy (trait 'youthOnly').
const CLUB_IDENTITIES={
  'Akademia Or\u0142\u00f3w':{budget:5000,traits:['youthOnly'],desc:'Klub-akademia bez bud\u017cetu. Rekrutuje WY\u0141\u0104CZNIE w\u0142asnych junior\u00f3w \u2014 \u017caden transfer z zewn\u0105trz. Wyzwanie: wygraj ni\u0105 I lig\u0119.'},
};

const TNAMES_AMATEUR=['LZS Słonecznik','LUKS Jedynka','KS Podlasie','GKTS Zryw','ULKS Nadwiślanin','TKKF Orlik','KS Młodzik','SKS Wieża'];

const CNAMES=['Andrzej Malik','Zbigniew Rot','Henryk Ptak','J\u00f3zef Kula','Tadeusz Wrona','Waldemar Sroka',
 'Ryszard B\u0105k','Zygmunt Orze\u0142','Marian Gawron','Kazimierz Kos','Boles\u0142aw Czajka','W\u0142adys\u0142aw Sok\u00f3\u0142',
 'Stefan Kruczek','Janusz Wierzbicki','Edmund Kasprzak','Lech Bielecki','Wies\u0142aw Gruszka','Bogdan Szulc',
 'Roman Kaczor','Hubert Serafin','Pawe\u0142 Kordas','Miros\u0142aw Cetnar','Jaromir Bilski','Dariusz Mitek',
 'Leszek Rataj','Oskar Bryl','Witold Paku\u0142a','J\u0119drzej Karpi\u0144ski'];

const SCOUTNAMES=['Jacek Orlik','Stanis\u0142aw Grzela','Krzysztof Byk','Roman Wilk','Aleksander Mr\u00f3z',
 'Leszek Pi\u0105tek','Henryk \u017bak','Miros\u0142aw Sroka','Tadeusz Kret','Zygmunt Tur',
 'Jaros\u0142aw Grot','Witold Dzik','Seweryn Kania','Bogdan Ku\u015b','Micha\u0142 K\u0142os','Mariusz Nurt',
 'Patryk Sokalski','Olgierd Bator','Marcel Bro\u017cek','Tobiasz Strug'];

const PHYSIONAMES=['Anna Kowalska','Beata Wr\u00f3bel','Dorota Szyma\u0144ska','Ewa Nowak','Monika Zieli\u0144ska',
 'Katarzyna Lis','Joanna D\u0105browska','Agnieszka Kos','Renata Jab\u0142o\u0144ska','Ma\u0142gorzata Ptak',
 'Paulina Kurek','Sylwia B\u0142aszczyk','Magdalena Wrona','Natalia St\u0119pie\u0144','Patrycja Kwiat',
 'Karolina Rusek','Aleksandra Krupa','Wioletta G\u00f3ra','Izabela Kwiatkowska','Marta Zych'];

const PSYCHNAMES=['Jan Wi\u015bniewski','Zofia Adamska','Krzysztof Lis','Irena Mazurek','Tomasz Bieli\u0144ski',
 'El\u017cbieta Kowal','Marek Zaj\u0105c','Barbara Nowak','\u0141ukasz Mroczek','Helena Doma\u0144ska',
 'Szymon Dobek','Alicja G\u0105sior','Wiktor Kuc','Monika K\u0142os','Rafa\u0142 Biernat','Teresa So\u0142tys'];

function makeSponsorPool(roots,sectors){
  return roots.flatMap(root=>sectors.map(sector=>`${root} ${sector}`));
}
// Fictional by design: official builds never imply a licence or endorsement.
// Community databases remain free to provide their own club and sponsor names.
const SPONSOR_ROOTS={
  PL:['Asteron','Cedrava','Deltaris','Elaris','Falkora','Grovex','Helvara','Iveron','Jantaro','Korveta','Lumaro','Novaris'],
  DE:['Rhevara','Nordkern','Alpenwerk','Silberhain','Westbruck','Kronfeld','Elboria','Falkenau','Morgenrot','Steinwald','Lichtberg','Tannwerk'],
  CN:['Jade River','Azure Peak','Golden Crane','Red Cedar','Silver Lotus','Eastern Gate','Dragon Well','Moon Harbor','Bright Field','Cloud Bridge','Long River','Pearl Summit'],
  JP:['Hikari Wave','Aozora','Kizuna','Takumi','Koyo','Shinsei','Yamabiko','Mizuhana','Akatsuki','Sorakaze','Hinode','Seiryu'],
  SE:['Nordljus','Fjällvind','Sjöform','Eldmark','Bergnova','Iskrona','Tallvik','Solhamn','Norrsken','Kustlinje','Malmglöd','Vinterbro'],
  KR:['Hanul','Baram','Nuri','Saebit','Gureum','Areum','Haedam','Pureun','Onbit','Dalmae','Garam','Mirinae'],
};
const SPONSOR_SECTORS={
  PL:['Energia','Finanse','Żywność','Technologie','Logistyka'],
  DE:['Energie','Finanz','Mobilität','Technik','Versand'],
  CN:['Energy','Finance','Foods','Digital','Logistics'],
  JP:['Energy','Finance','Foods','Digital','Transit'],
  SE:['Energi','Finans','Mat','Teknik','Transport'],
  KR:['Energy','Finance','Foods','Digital','Mobility'],
};
const COUNTRY_SPONSORS=Object.fromEntries(COUNTRY_IDS.map(id=>[
  id,
  makeSponsorPool(SPONSOR_ROOTS[id],SPONSOR_SECTORS[id]),
]));
const SNAMES=COUNTRY_SPONSORS.PL;

const SGOALS=['top2','top3','top4','top6','top8','win4','win6','win8','win10','win12','win14','win16'];

const SPONSOR_TIERS=[
  {minPrestige:0,  rewardMult:0.5,  cooldown:2,label:'Lokalny'},
  {minPrestige:20, rewardMult:0.85, cooldown:1,label:'Regionalny'},
  {minPrestige:40, rewardMult:1.0,  cooldown:1,label:'Krajowy'},
  {minPrestige:65, rewardMult:1.4,  cooldown:0,label:'Premium'},
  {minPrestige:85, rewardMult:2.0,  cooldown:0,label:'Elite'},
];

const COACH_STYLES={
  OFENSYWNY:{id:'OFENSYWNY',label:'Ofensywny',icon:'\u2694',desc:'Wzmacnia zawodnik\u00f3w ATK/SRV.',statFocus:'atk',synergy:'FH_LOOPER'},
  DEFENSYWNY:{id:'DEFENSYWNY',label:'Defensywny',icon:'\ud83d\udee1',desc:'Wzmacnia grę obronną i głowę.',statFocus:'def',synergy:'DEFENDER'},
  WSZECHSTRONNY:{id:'WSZECHSTRONNY',label:'Wszechstronny',icon:'\u26a1',desc:'R\u00f3wny bonus.',statFocus:'all',synergy:'TWO_SIDED'},
  SERWISOWY:{id:'SERWISOWY',label:'Serwisowy',icon:'\ud83c\udfaf',desc:'Dominacja serwisem.',statFocus:'srv',synergy:'BLOCKER'},
  MENTALNY:{id:'MENTALNY',label:'Mentalny',icon:'\ud83e\udde0',desc:'Psychologia i koncentracja.',statFocus:'men',synergy:'FISHER'},
};

const PLAYER_STYLES=['TWO_SIDED','FH_LOOPER','BLOCKER','FISHER','DEFENDER'];

// Five real table-tennis archetypes. This table is the SINGLE SOURCE OF TRUTH:
// it drives the UI/guide AND the match engine (the `engine` block). The rally
// engine and the in-game guide both read from here. `beats`/`losesTo` describe
// the counter-pentagon and must stay consistent with STYLE_EDGE in gameplay.js.
const PLAYER_STYLE_INFO={
  TWO_SIDED:{
    label:'Napastnik obustronny',archetype:'napastnik obustronny',grip:'Klasyczny (shakehand)',color:'var(--r)',
    desc:'Agresywny topspin z obu stron stołu — współczesny standard. Stabilny i kompletny.',
    strengths:['Równie groźny z forhendu i bekhendu','Szybkie otwarcie akcji (banan/flick)','Brak wyraźnej dziury w grze'],
    weaknesses:['Mniej skrajnej mocy niż czysty looper','Cierpliwy obrońca potrafi go rozegrać'],
    beats:['FH_LOOPER','BLOCKER'],losesTo:['DEFENDER','FISHER'],
    engine:{winnerMult:1.08,errorMult:1.0,oppErrorMult:1.0,aceBonus:0,allStatLift:3},
  },
  FH_LOOPER:{
    label:'Topspin z forhendu',archetype:'topspinowy egzekutor',grip:'Penhold / klasyczny',color:'var(--orange)',
    desc:'Dominacja potężnym forhendem. Szuka zakończenia akcji jak najszybciej.',
    strengths:['Największa moc kończąca','Groźny po serwisie (atak trzeciej piłki)','Przebija obronę i lob'],
    weaknesses:['Słabszy bekhend / punkt przejścia','Dużo błędów przy ryzyku','Bloker wykorzystuje jego tempo'],
    beats:['BLOCKER','FISHER'],losesTo:['TWO_SIDED','DEFENDER'],
    engine:{winnerMult:1.2,errorMult:1.16,oppErrorMult:1.0,aceBonus:0,allStatLift:0},
  },
  BLOCKER:{
    label:'Kontra i blok',archetype:'kontrujący technik',grip:'Klasyczny / penhold',color:'var(--g)',
    desc:'Gra blisko stołu: szybki blok i kontra wykorzystujące energię rywala. Minimum błędów.',
    strengths:['Świetny przeciw mocnym napastnikom','Bardzo mało błędów niewymuszonych','Zmienia kierunki i rytm'],
    weaknesses:['Sam generuje mało mocy','Bezradny, gdy rywal nie daje tempa','Pod presją nie domyka akcji'],
    beats:['FISHER','DEFENDER'],losesTo:['FH_LOOPER','TWO_SIDED'],
    engine:{winnerMult:0.95,errorMult:0.84,oppErrorMult:1.1,aceBonus:0.01,allStatLift:0},
  },
  FISHER:{
    label:'Obrona z półdystansu',archetype:'obrońca półdystansu',grip:'Klasyczny (shakehand)',color:'var(--blue)',
    desc:'Wraca do gry wysokimi lobami i amortyzacją z dystansu. Frustruje niecierpliwych.',
    strengths:['Odsyła pozornie wygrane piłki','Męczy psychicznie napastników','Świetna koordynacja przestrzenna'],
    weaknesses:['Słaby przeciw cierpliwemu smeczowi','Oddaje inicjatywę','Wymaga ogromnej kondycji'],
    beats:['DEFENDER','TWO_SIDED'],losesTo:['BLOCKER','FH_LOOPER'],
    engine:{winnerMult:0.84,errorMult:0.82,oppErrorMult:1.07,aceBonus:0,allStatLift:0},
  },
  DEFENDER:{
    label:'Nowoczesny defensor',archetype:'defensor z podcięciem',grip:'Klasyczny (shakehand)',color:'var(--gold)',
    desc:'Klasyczne podcięcie (chop) z dystansu połączone z nagłym kontratakiem z forhendu.',
    strengths:['Zmusza rywala do błędów','Nieprzewidywalna zmiana rotacji','Najniższy własny błąd w długich wymianach'],
    weaknesses:['Bardzo mało własnych winnerów','Szybki bloker nie daje mu czasu','Skrajne wymagania kondycyjne'],
    beats:['TWO_SIDED','FH_LOOPER'],losesTo:['FISHER','BLOCKER'],
    // Slight counter vs attackers; skill (OVR) still dominates large gaps.
    engine:{winnerMult:0.82,errorMult:0.78,oppErrorMult:1.06,aceBonus:-0.02,allStatLift:0},
  },
};

const TECH_PARTNERSHIPS=[
  {id:'tp_local',name:'Baseline Gearworks',tier:1,prestige:[0,100],costPerSeason:-1000,bonus:{men:1},mktBonus:0.02,developmentBonus:0.05,profileId:'development',rubberId:'development',bonusDesc:'+1 mentalności · +5% rozwoju · +2% marketability',desc:'Podstawowy kontrakt rozwojowy dostępny dla każdego klubu.',icon:'🏓'},
  {id:'tp_regional',name:'RallyLab Regional',tier:2,prestige:[16,100],costPerSeason:-800,bonus:{ret:1,men:1},mktBonus:0.03,developmentBonus:0,profileId:'control',rubberId:'control',bonusDesc:'+1 odbioru i mentalności · +3% marketability',desc:'Regionalny partner stawiający na kontrolę.',icon:'🧪'},
  {id:'tp_national',name:'PulseForge Performance',tier:3,prestige:[30,100],costPerSeason:-1200,bonus:{bh:1,foot:1},mktBonus:0.04,developmentBonus:0,profileId:'speed',rubberId:'speed',bonusDesc:'+1 backhandu i szybkości · +4% marketability',desc:'Krajowy partner dla dynamicznych zespołów.',icon:'⚡'},
  {id:'tp_pro',name:'IronLoop Pro Circuit',tier:4,prestige:[48,100],costPerSeason:-1600,bonus:{fh:1,srv:1},mktBonus:0.04,developmentBonus:0,profileId:'offensive',rubberId:'offensive',bonusDesc:'+1 forhendu i serwisu · +4% marketability',desc:'Profesjonalny partner ofensywny.',icon:'🚀'},
  {id:'tp_elite',name:'Jade Arc Elite',tier:5,prestige:[64,100],costPerSeason:1200,bonus:{},mktBonus:0.07,developmentBonus:0,profileId:'commercial',rubberId:'balanced',bonusDesc:'Zbalansowany sprzęt · +7% marketability',desc:'Elitarny kontrakt o zbalansowanym profilu sprzętowym.',icon:'💎'},
  {id:'tp_world',name:'BlackArc Signature',tier:6,prestige:[82,100],costPerSeason:3500,bonus:{},mktBonus:0.15,developmentBonus:0,profileId:'commercial',rubberId:'commercial',bonusDesc:'+15% marketability',desc:'Globalny kontrakt nastawiony na siłę marki.',icon:'🌍'},
];

const INFRA_HALL=[
  {level:0,name:'Brak hali',desc:'Treningi na podw\u00f3rku',trainingBonus:0,cost:0,upkeep:0,capacity:50},
  {level:1,name:'Sala sportowa',desc:'+10% efektywno\u015bci trenera',trainingBonus:0.10,cost:12000,upkeep:1000,capacity:150},
  {level:2,name:'Profesjonalna hala',desc:'+25% efektywno\u015bci trenera',trainingBonus:0.25,cost:28000,upkeep:2500,capacity:300},
  {level:3,name:'Centrum olimpijskie',desc:'+50% efektywno\u015bci trenera',trainingBonus:0.50,cost:60000,upkeep:5000,capacity:500},
  {level:4,name:'Narodowy kampus TT',desc:'+65% efektywno\u015bci trenera i lepsze przygotowanie meczowe',trainingBonus:0.65,cost:95000,upkeep:8000,capacity:850},
  {level:5,name:'Hyper Performance Dome',desc:'+80% efektywno\u015bci trenera i topowe warunki przygotowa\u0144',trainingBonus:0.80,cost:145000,upkeep:12000,capacity:1300},
  {level:6,name:'Performance Institute',desc:'+90% efektywno\u015bci trenera; projekt dla sta\u0142ego klubu czo\u0142\u00f3wki',trainingBonus:0.90,cost:260000,upkeep:20000,capacity:1800},
  {level:7,name:'World Training Campus',desc:'+100% efektywno\u015bci trenera; ko\u0144cowy etap rozwoju zaplecza',trainingBonus:1.00,cost:480000,upkeep:32000,capacity:2500},
];

const INFRA_MED=[
  {level:0,name:'Brak centrum med.',desc:'Standardowy czas leczenia',injBonus:0,cost:0,upkeep:0},
  {level:1,name:'Gabinet medyczny',desc:'-25% czasu kontuzji',injBonus:0.25,cost:8000,upkeep:1000},
  {level:2,name:'Centrum rehabilitacji',desc:'-50% czasu kontuzji',injBonus:0.50,cost:20000,upkeep:2000},
  {level:3,name:'Centrum medycyny sportu',desc:'-50% czasu kontuzji + mniejsze ryzyko nawrotu',injBonus:0.50,cost:45000,upkeep:4000},
  {level:4,name:'Laboratorium przeci\u0105\u017ce\u0144',desc:'-60% czasu kontuzji i wyra\u017anie mniejsze ryzyko urazu',injBonus:0.60,cost:78000,upkeep:6000},
  {level:5,name:'Instytut regeneracji',desc:'-70% czasu kontuzji i pe\u0142ne zaplecze odnowy',injBonus:0.70,cost:118000,upkeep:9000},
  {level:6,name:'Biomechanics Lab',desc:'-76% czasu kontuzji; prewencja oparta na analizie obci\u0105\u017ce\u0144',injBonus:0.76,cost:220000,upkeep:14000},
  {level:7,name:'Elite Recovery Institute',desc:'-82% czasu kontuzji; najwy\u017cszy standard regeneracji',injBonus:0.82,cost:400000,upkeep:22000},
];

// Academy levels (single source of truth \u2014 gameplay.js reads THIS, not a copy).
// Per level: potentialBonus (legacy ceiling nudge), cost (one-off build), upkeep
// (NEW: charged every season-end), intake OVR band [ovrLo,ovrHi], peak/ceiling band
// [ceilLo,ceilHi], devBonus (extra development multiplier in applyGrowth). Higher
// level = better juniors AND faster development, but a heavier yearly upkeep \u2192
// a real reason to upgrade, and a real reason to downgrade in a cash crisis.
const INFRA_ACADEMY=[
  {level:0,name:'Brak akademii',desc:'Brak szkolenia junior\u00f3w',potentialBonus:0,cost:0,upkeep:0,ovrLo:0,ovrHi:0,ceilLo:0,ceilHi:0,devBonus:0},
  {level:1,name:'Sekcja juniorska',desc:'Juniorzy OVR 25-38, peak do ~66',potentialBonus:0.15,cost:10000,upkeep:2000,ovrLo:25,ovrHi:38,ceilLo:56,ceilHi:66,devBonus:0},
  {level:2,name:'Akademia m\u0142odzie\u017cowa',desc:'Juniorzy OVR 30-45, peak do ~72',potentialBonus:0.30,cost:25000,upkeep:5000,ovrLo:30,ovrHi:45,ceilLo:60,ceilHi:72,devBonus:0.05},
  {level:3,name:'Elitarna akademia',desc:'Juniorzy OVR 35-52, peak do ~80',potentialBonus:0.50,cost:55000,upkeep:10000,ovrLo:35,ovrHi:52,ceilLo:64,ceilHi:80,devBonus:0.10},
  {level:4,name:'Centrum rozwoju talent\u00f3w',desc:'Juniorzy OVR 38-58, peak do ~86',potentialBonus:0.64,cost:90000,upkeep:18000,ovrLo:38,ovrHi:58,ceilLo:68,ceilHi:86,devBonus:0.16},
  {level:5,name:'Narodowa ku\u017ania mistrz\u00f3w',desc:'Juniorzy OVR 42-64, peak do ~92',potentialBonus:0.78,cost:138000,upkeep:30000,ovrLo:42,ovrHi:64,ceilLo:72,ceilHi:92,devBonus:0.22},
  {level:6,name:'International Talent Centre',desc:'Juniorzy OVR 45-66, peak do ~94',potentialBonus:0.86,cost:280000,upkeep:50000,ovrLo:45,ovrHi:66,ceilLo:76,ceilHi:94,devBonus:0.26},
  {level:7,name:'World Elite Academy',desc:'Juniorzy OVR 48-68, peak do ~96',potentialBonus:0.92,cost:520000,upkeep:80000,ovrLo:48,ovrHi:68,ceilLo:80,ceilHi:96,devBonus:0.30},
];

const INFRA_MERCH=[
  {level:0,name:'Brak sklepu',desc:'Brak przychod\u00f3w z merchandisingu',income:0,cost:0,upkeep:0},
  {level:1,name:'Stragan kibica',desc:'Skromne gad\u017cety. +3% od marketability klubu',income:0.03,cost:15000,upkeep:500},
  {level:2,name:'Sklep Online',desc:'Koszulki i pami\u0105tki. +6% od marketability klubu',income:0.06,cost:32000,upkeep:1000},
  {level:3,name:'Megasklep',desc:'Pe\u0142na oferta. +10% od marketability klubu',income:0.10,cost:70000,upkeep:2000},
  {level:4,name:'Platforma lifestyle',desc:'Kolekcje klubowe. +14% od marketability klubu',income:0.14,cost:105000,upkeep:4000},
  {level:5,name:'Global fan store',desc:'Mi\u0119dzynarodowy sklep premium. +18% od marketability klubu',income:0.18,cost:150000,upkeep:7000},
  {level:6,name:'International Commerce Hub',desc:'Sprzeda\u017c mi\u0119dzynarodowa. +22% od marketability klubu',income:0.22,cost:270000,upkeep:11000},
  {level:7,name:'Global Brand Network',desc:'Pe\u0142na sie\u0107 licencyjna. +26% od marketability klubu',income:0.26,cost:470000,upkeep:17000},
];

const PR_DIRECTORS=[
  {id:'pr1',name:'Agnieszka Wolska',level:1,bonus:0.02,cooldownReduce:0,salary:2500,cost:5000},
  {id:'pr2',name:'Bart\u0142omiej Krupa',level:2,bonus:0.04,cooldownReduce:1,salary:5000,cost:12000},
  {id:'pr3',name:'Natalia Czajka',level:3,bonus:0.06,cooldownReduce:2,salary:9000,cost:25000},
];

const SCOUT_SPECIALTIES=[
  {id:'youth',label:'Juniorzy',desc:'Specjalista od zawodnik\u00f3w 16-19 lat',qualityBonus:0.3},
  {id:'regional',label:'Regionalny',desc:'Zna lokalne ligi',qualityBonus:0.1},
  {id:'talent',label:'\u0141owca Talent\u00f3w',desc:'Odkrywa ukryty potencja\u0142',qualityBonus:0.2},
  {id:'veteran',label:'Weteran\u00f3w',desc:'Sie\u0107 kontakt\u00f3w',qualityBonus:0.25},
];

const POLISH_REGIONS=['Mazowsze','\u015al\u0105sk','Ma\u0142opolska','Wielkopolska','Dolny \u015al\u0105sk','Pomorze'];

const TOTAL_MATCHDAYS=22;

const CHART_COLORS=['#c02818','#1a50a0','#207040','#b07800','#6828a0','#1c6868','#c84800','#a04060','#606020','#205080','#804020','#408040'];
// ── LEAGUE MATCH FORMATS (owner dossier 2026-07-03) ───────────────────────────
// Real per-league protocols. `protocol` drives the game order in simTeamMatch:
//   superliga — G1 A-Y, G2 B-X, G3 C-Z, G4 A/rezerwowy vs X/rezerwowy, G5 DEBEL
//   olympic   — 3-man squads: G1 A-X, G2 B-Y, G3 DEBEL (B+C / Y+Z), G4 A-Y, G5 C-X
//   tleague   — G1 DEBEL (best-of-3), G2-G4 single (best-of-5), 2:2 → VICTORY MATCH (1 set)
// Set rules: goldenPoint = no 2-pt advantage outside the decider (10:10 → next
// point wins); deciderFrom = the deciding set starts at N:N; lastSetTo/WinBy =
// Polish rule: 5th set to 6 points, no advantage.
// tablePoints: 'superliga' 3/2/1/0 · 'win2' 2/0 · 'win2loss1' 2/1 ·
// 'tleague' 4 (clean) / 3 (po VM) / 1 (VM przegrany) / 0.
const LEAGUE_FORMATS={
  PL:{label:'LOTTO Superliga',protocol:'superliga',tablePoints:'superliga',lastSetTo:6,lastSetWinBy:1},
  DE:{label:'TTBL',protocol:'superliga',tablePoints:'win2'},
  SE:{label:'Pingisligan',protocol:'superliga',tablePoints:'win2'},
  CN:{label:'CTTSL',protocol:'olympic',tablePoints:'win2loss1'},
  KR:{label:'K-League TT',protocol:'olympic',tablePoints:'win2loss1'},
  JP:{label:'T.League',protocol:'tleague',tablePoints:'tleague',goldenPoint:true,deciderFrom:6},
};

// ── EQUIPMENT: blade / rubber / sponge (owner research file 2026-07-03) ───────
// Small, readable stat modifiers — the setup fits the play style, it does not
// replace it. Rubber freshness is a CLUB-level, recurring investment (rubbers
// wear out), blades/sponges are the player's personal setup.
const EQUIPMENT={
  rubberProfiles:{
    offensive:{id:'offensive',mods:{fh:1,srv:1},fitStyles:['FH_LOOPER','TWO_SIDED']},
    control:{id:'control',mods:{ret:1,men:1},fitStyles:['BLOCKER','DEFENDER','FISHER']},
    speed:{id:'speed',mods:{bh:1,foot:1},fitStyles:['TWO_SIDED','BLOCKER']},
    development:{id:'development',mods:{men:1},fitStyles:PLAYER_STYLES},
    balanced:{id:'balanced',mods:{fh:1,bh:1},fitStyles:['TWO_SIDED']},
    commercial:{id:'commercial',mods:{},fitStyles:PLAYER_STYLES},
  },
  blades:{
    OFF:{id:'OFF',label:'Deska ofensywna (carbon)',desc:'Sztywna i szybka — mocniejszy atak, trudniejszy odbiór.',mods:{fh:2,bh:1,ret:-1}},
    ALL:{id:'ALL',label:'Deska allround (5-warstwowa)',desc:'Zbalansowana — kontrola serwisu i odbioru.',mods:{srv:1,ret:1}},
    DEF:{id:'DEF',label:'Deska defensywna',desc:'Wolniejsza, sprężysta — kontrola, czucie, obrona.',mods:{ret:2,men:1,fh:-1}},
  },
  sponges:{
    GRUBA:{id:'GRUBA',label:'Gąbka 2.1 mm',desc:'Maksimum prędkości i rotacji, mniej kontroli.',mods:{fh:1,srv:1,ret:-1}},
    SREDNIA:{id:'SREDNIA',label:'Gąbka 1.9 mm',desc:'Kompromis prędkość/kontrola.',mods:{}},
    CIENKA:{id:'CIENKA',label:'Gąbka 1.5 mm',desc:'Kontrola i czucie — wybór defensorów i blokerów.',mods:{ret:1,men:1,fh:-1}},
  },
  rubberTiers:[
    {tier:0,label:'Okładziny magazynowe',desc:'Zużyte, wielosezonowe — bez bonusu.',mods:{},costPerPlayer:0},
    {tier:1,label:'Okładziny turniejowe',desc:'Świeże okładziny klasy turniejowej.',mods:{fh:1,srv:1},costPerPlayer:900},
    {tier:2,label:'Okładziny PRO',desc:'Topowe, wymieniane co miesiąc jak u zawodowców.',mods:{fh:2,srv:1,ret:1},costPerPlayer:2600},
  ],
};

// ── 10x name pools (owner 2026-07-02) ─────────────────────────────────────────
// src/data/names.js (loaded just before this file) defines window.PPM_NAMES with
// ~500 first/last names per country. Merged into COUNTRIES here with dedupe; the
// guard keeps everything working if the file is absent (e.g. older checkouts).
if(typeof window!=='undefined'&&window.PPM_NAMES){
  Object.entries(window.PPM_NAMES).forEach(([cid,pool])=>{
    const c=COUNTRIES[cid];if(!c)return;
    c.firstNames=[...new Set([...(c.firstNames||[]),...(pool.first||[])])];
    c.lastNames=[...new Set([...(c.lastNames||[]),...(pool.last||[])])];
  });
  if(window.PPM_NAMES.PL){
    const fset=new Set(FN);(window.PPM_NAMES.PL.first||[]).forEach(n=>{if(!fset.has(n))FN.push(n);});
    const lset=new Set(LN);(window.PPM_NAMES.PL.last||[]).forEach(n=>{if(!lset.has(n))LN.push(n);});
  }
}
const constants = { COUNTRIES, COUNTRY_IDS, RECORDS_KEYS, LEAGUE_FORMATS, EQUIPMENT, TRAITS, SK, SL, FN, LN, TNAMES_L1, TNAMES_L2, TNAMES_AMATEUR, CNAMES, SCOUTNAMES, PHYSIONAMES, PSYCHNAMES, SNAMES, COUNTRY_SPONSORS, SGOALS, SFULL, SPONSOR_TIERS, COACH_STYLES, PLAYER_STYLES, PLAYER_STYLE_INFO, TECH_PARTNERSHIPS, INFRA_HALL, INFRA_MED, INFRA_ACADEMY, INFRA_MERCH, PR_DIRECTORS, SCOUT_SPECIALTIES, POLISH_REGIONS, TOTAL_MATCHDAYS, CHART_COLORS, CLUB_IDENTITIES };
window.PPM.constants = constants;
