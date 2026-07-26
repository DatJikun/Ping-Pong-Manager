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
    l1Names:['Borussia D\u00fcsseldorf','TTC Bergneustadt','Fakel Neu-Ulm','TSV Schwabhausen','SV Post Telekom Flensburg','TTC Frankfurt','1FC Saarbr\u00fccken TT','TTC Zugbr\u00fccke Grenzau','TSV Schwalbe Bergneustadt','SC Preu\u00dfen M\u00fcnster','TTC Rh\u00f6nSprudel Maberzell','FC Karben'],
    l2Names:['DJK G\u00f6nnern','SV Tegel','TSG Bielefeld','VfL Osnabr\u00fcck TT','SV Brackwede','SSV Reutlingen','TTC M\u00fcnchen West','TTC Schwandorf','TuS Weckhoven','SC Eintracht Berlin','TSV Vinnhorst','GW Hamm-Rhynern'],
    firstNames:['Thomas','Michael','Andreas','Stefan','Markus','Christian','Martin','Klaus','Frank','Peter','J\u00fcrgen','Wolfgang','Hans','Dieter','Rainer','Karl','Bernd','Uwe','Horst','Werner','Lukas','Felix','Jonas','Leon','Tim','Julian','Maximilian','Finn','Niklas','Moritz','Tobias','Dominik','Florian','Matthias','Nico','Fabian','Daniel','Alexander','Bastian','Philipp','Johannes','Anton','David','Noah','Samuel','Benedikt','Vincent','Lennart','Patrick','Henning','Sascha','Ole','Kai','Sebastian','Marius','Dennis','Roman','Erik','Konrad','Timo'],
    lastNames:['M\u00fcller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Sch\u00e4fer','Koch','Bauer','Richter','Klein','Wolf','Schr\u00f6der','Neumann','Schwarz','Zimmermann','Braun','Kr\u00fcger','Hartmann','Lange','Werner','Schmitz','Meier','Krause','Lehmann','Schmid','Schulze','Maier','K\u00f6hler','Herrmann','K\u00f6nig','Walter','Mayer','Huber','Kaiser','Fuchs','Peters','Lang','Scholz','M\u00fcller','J\u00e4ger','Wei\u00df','Jung','Keller','Hahn','Lorenz','Bergmann','Albrecht','Franke','Busch','Voigt','Kramer','Dietrich','Arnold','Seidel','Fr\u00f6hlich'],
    nationalTeam:'Nationalmannschaft',
    worldRank:3,
  },
  CN: {
    id:'CN', name:'Chiny', peakAgeBand:[21,26], flag:'\ud83c\udde8\ud83c\uddf3',
    budgetMult:3.5, ovrMult:1.35,
    l1Names:['Shandong Luneng','Shanghai Longwu','Beijing Capital','Guangdong Dragon','Tianjin Binhai','Chengdu Roncheng','Wuhan Zhuo Erdeng','Nanjing Jiangnan','Shenzhen Longhua','Zhejiang Lions','Hebei Hengshui','Sichuan Jiannanchun'],
    l2Names:['Dalian Renhe','Qingdao Huanghai','Xiamen Blue Lions','Kunming Ruili','Changsha Ginde','Zhengzhou Huo Feng','Fuzhou Tianyi','Jinan Steel','Harbin TT Club','Hangzhou Green Town','Xian Changan','Chongqing Liangjiang'],
    firstNames:['Wei','Fang','Chao','Long','Jian','Ming','Lei','Hao','Kai','Feng','Tao','Jun','Bo','Yang','Zhe','Peng','Xu','Dong','Rui','Lin','Qiang','Yong','Tian','Shuo','Haoran','Zhiyuan','Jie','Bin','Yichen','Guang','Jin','Shen','Yifan','Xun','Yuan','Cheng','Hong','Xin','Zhen','Yun','An','Bao','Cen','Dawei','Enlai','Guoliang','Han','Junjie','Ke','Liren','Ning','Pei','Qin','Sheng','Teng','Wenhao','Xiang','Yuze','Zimo','Zhikai'],
    lastNames:['Zhang','Wang','Li','Liu','Chen','Yang','Zhao','Huang','Wu','Zhou','Xu','Sun','Ma','Hu','Zhu','Guo','Lin','He','Gao','Luo','Deng','Fang','Jiang','Cao','Yuan','Pan','Tang','Xie','Shen','Han','Lu','Wei','Feng','Yu','Dong','Xiao','Cheng','Ye','Su','Peng','Hong','Cui','Zeng','Tian','Qian','Yan','Du','Fan','Hou','Jin','Kong','Meng','Qiu','Ren','Shao','Tao','Wen','Xiong','Yin','Zou'],
    nationalTeam:'Zh\u014dnggu\u00f3 Du\u00ec',
    worldRank:1,
  },
  JP: {
    id:'JP', name:'Japonia', peakAgeBand:[21,26], flag:'\ud83c\uddef\ud83c\uddf5',
    budgetMult:2.8, ovrMult:1.22,
    l1Names:['Esforta TTC','TTC Butterfly','Nittaku Premium','T-Power TTC','Tasaki TTC','Saitama TT Club','Osaka Premier','Nagoya Falcons','Fukuoka TTC','Kobe Stars','Sendai Eagles','Hiroshima Carp TT'],
    l2Names:['Yokohama TTC','Kyoto TTC','Kawasaki Kings','Chiba Rockets','Sapporo North','Niigata TTC','Matsuyama TTC','Okayama TT','Kumamoto TTC','Kagoshima Stars','Naha Ryukyu','Aomori Blizzard'],
    firstNames:['Yuki','Haruto','Sota','Hayato','Yuto','Riku','Kai','Ren','Ryota','Takumi','Shun','Kento','Daiki','Naoki','Yusuke','Tatsuya','Masaya','Hiroto','Kazuki','Tomoki','Sora','Itsuki','Minato','Koki','Sho','Taiga','Kosei','Toma','Ryusei','Keita','Haruki','Soma','Rin','Aoi','Kaito','Akito','Asahi','Chihiro','Eita','Fumiya','Genki','Hinata','Issei','Junpei','Kohei','Makoto','Noboru','Reo','Shota','Yamato','Yoshiki','Taichi','Yuu','Masato','Noriaki','Seiya','Takeru','Yoshiro','Zen','Yuya'],
    lastNames:['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto','Inoue','Kimura','Hayashi','Shimizu','Ogawa','Ishikawa','Nakajima','Hasegawa','Abe','Ikeda','Hashimoto','Ishii','Yamashita','Mori','Fujita','Okada','Goto','Hara','Murakami','Kondo','Ishida','Sakamoto','Endo','Aoki','Fukuda','Miura','Nakai','Ueda','Sugiyama','Nishimura','Ando','Takeuchi','Kaneko','Tamura','Fujii','Ono','Maruyama','Kudou','Shibata','Kawasaki','Okamoto','Tsuchiya','Nagata','Kishimoto','Mizuno'],
    nationalTeam:'Nihon Daihyo',
    worldRank:4,
  },
  SE: {
    id:'SE', name:'Szwecja', peakAgeBand:[27,32], flag:'\ud83c\uddf8\ud83c\uddea',
    budgetMult:1.6, ovrMult:1.05,
    l1Names:['Sp\u00e5rv\u00e4gens TK','Halmstad BTK','IFK Liding\u00f6 TK','Kalmar BTK','\u00d6rebro TK','Link\u00f6ping TK','Ume\u00e5 TK','Uppsala BTK','Malm\u00f6 TK','Sundsvall TK','G\u00f6teborg TK','Stockholm Royals'],
    l2Names:['Sk\u00f6vde TK','Eskilstuna TK','Bor\u00e5s TK','Lule\u00e5 TK','J\u00f6nk\u00f6ping TK','G\u00e4vle TK','V\u00e4ster\u00e5s TK','Helsingborg TK','Norrkoping TK','Falun TK','H\u00e4rn\u00f6sand TK','V\u00e4xj\u00f6 TK'],
    firstNames:['Erik','Lars','Karl','Anders','Johan','Henrik','Per','Magnus','Stefan','Jonas','David','Peter','Mikael','Jan','Kristoffer','Patrik','Andreas','Bj\u00f6rn','Mattias','Linus','Emil','Viktor','Oscar','Anton','Filip','Axel','Gustav','Hugo','Ludvig','Nils','Robin','Adam','Albin','Dennis','Elias','Fabian','Glenn','Isak','Jesper','Kasper','Love','Melker','Niklas','Olle','Pontus','Rasmus','Simon','Tobias','Valter','William','Arvid','Daniel','Fredrik','Gunnar','Hannes','Joakim','Kalle','Leo','Martin','Sebbe'],
    lastNames:['Andersson','Johansson','Karlsson','Nilsson','Eriksson','Larsson','Olsson','Persson','Svensson','Gustafsson','Pettersson','Jonsson','Jansson','Hansson','Bengtsson','J\u00f6nsson','Lindstr\u00f6m','Jakobsson','Magnusson','Olofsson','Lundberg','Berg','Lindgren','Lundqvist','Bergstr\u00f6m','Axelsson','Berglund','Lindholm','Eklund','Sandberg','Sj\u00f6berg','Nystr\u00f6m','Holm','Danielsson','Hellstr\u00f6m','Forsberg','Engstr\u00f6m','Str\u00f6m','Sundberg','\u00d6berg','Blomqvist','Norberg','Edlund','\u00c5hman','Dahlberg','Lindqvist','Ros\u00e9n','S\u00f6derberg','Westin','Wikstr\u00f6m','Bj\u00f6rklund','Ekstr\u00f6m','Fransson','M\u00e5rtensson','Viklund','Holmgren','N\u00e4slund','T\u00f6rnqvist','\u00c5kesson','Hedlund'],
    nationalTeam:'Sveriges Landslag',
    worldRank:6,
  },
  KR: {
    id:'KR', name:'Korea', peakAgeBand:[21,26], flag:'\ud83c\uddf0\ud83c\uddf7',
    budgetMult:2.0, ovrMult:1.12,
    l1Names:['Seoul Samsung','Busan Lions','Korea Express TT','IBK Altos','Woori Card TT','Daegu Thunder','Incheon Elephants','Gwangju TT','Daejeon Korail','Ulsan TT','Suwon TTC','Pohang Steelers TT'],
    l2Names:['Jeonju TT','Changwon TTC','Goyang TT','Anyang TT','Seongnam TTC','Bucheon TT','Cheonan Blue Wings','Gumi TT','Chuncheon TT','Jinju TT','Jeju TTC','Andong TT'],
    firstNames:['Minjun','Seojun','Dohyun','Junho','Juwon','Taehoon','Hyunwoo','Gunwoo','Yujin','Jaemin','Seungwoo','Dongwoo','Minseok','Jihoon','Woobin','Soohyun','Kyungjin','Sangwoo','Jaehyun','Yoonsoo','Jiho','Minjae','Hyeonjun','Siwoo','Eunho','Taeyang','Seungmin','Jisung','Kyuhyun','Yejun','Taemin','Byungho','Chanwoo','Daesung','Eunwoo','Hojin','Inho','Jongsu','Kihyun','Minho','Namjun','Sungmin','Taegyu','Ujin','Wonjun','Yeongho','Youngmin','Jinhwan','Seungho','Doyun','Hoseok','Joon','Kwanwoo','Minseong','Sihun','Taewoo','Woojin','Yongho','Junseok','Seonho'],
    lastNames:['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Shin','Kwon','Hwang','Ahn','Song','Yu','Hong','Ko','Moon','Baek','Heo','Nam','Jeon','Seo','Bae','Cha','Noh','Ha','Sim','Ryu','Jeong','Jin','Min','An','Byeon','Gwak','Gu','Im','Ma','Na','Ra','Son','Yang','Yeo','Yim','Jo','Chu','Do','Gang','Go','Kuk','Seol','Tak','Won','Wi','Yeom','Byeong','Pyo'],
    nationalTeam:'Daehan Minguk',
    worldRank:5,
  }
};

const COUNTRY_IDS = Object.keys(COUNTRIES);

const MUNDIAL_PARTICIPANTS = 16; // 16 national teams
const MUNDIAL_INTERVAL = 2; // every 2 seasons, offset from Olympics

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

const SNAMES=['Orlen','PKN Lotos','Allegro','InPost','Maspex','\u017bywiec','Tymbark','Wedel','Amica',
 'Fakro','Bioton','Drutex','Bank Pekao','LPP SA','Asseco','CCC Group','Kruk SA','Play Mobile',
 'Wittchen','Biedronka','CD Projekt','Comarch','PKO BP','mBank','Benefit Systems','\u017babka','Polpharma',
 'Reserved','Cropp','Sinsay','House','Mohito','Rossmann','Hebe','x-kom','Media Expert','Neonet',
 'Cyfrowy Polsat','Play','Plus','T-Mobile PL','Netia','Empik','Lubella','Soko\u0142\u00f3w','Tarczy\u0144ski','Mlekovita',
 'Grupa Azoty','KGHM','JSW','Tauron','Enea','Energa','Santander PL','ING Bank \u015al\u0105ski','Alior Bank','PZU',
 'Grupa Maspex','Oshee','Tiger','Kubu\u015b','Hortex','Ziaja','Inglot','W\u00f3lczanka','Vistula','Solaris'];
// Country-appropriate sponsor pools (owner: a Chinese club shouldn't advertise
// Allegro/InPost). Includes each country's real table-tennis brands where they exist
// (Stiga=SE, Butterfly/Nittaku/Yasaka/TSP=JP, Li-Ning/DHS=CN). PL falls back to SNAMES.
const COUNTRY_SPONSORS={
  PL:SNAMES,
  DE:['Adidas','BMW','Siemens','SAP','Bosch','Bayer','Volkswagen','Allianz','DHL','Lufthansa','Puma','Deutsche Bank','Continental','Henkel','Nivea','Miele','ThyssenKrupp','Telekom','Aldi','Lidl','Zeiss','Merck','Adler TT','Uhlmann',
    'Mercedes-Benz','Audi','Porsche','BASF','Infineon','Commerzbank','DZ Bank','Bitburger','Warsteiner','Beck\'s','Dr. Oetker','Haribo','Ritter Sport','Milka DE','WMF','Braun','Sennheiser','Rossmann DE','dm-drogerie','MediaMarkt','Saturn','Otto','Zalando','Trigema'],
  CN:['Alibaba','Tencent','Huawei','Xiaomi','JD.com','Baidu','ICBC','China Mobile','Li-Ning','ANTA','DHS','Meituan','BYD','Haier','Lenovo','Vivo','Oppo','Ping An','Sinopec','Yili','Midea','Geely','Double Fish','Bank of China',
    'PetroChina','China Telecom','China Unicom','Bank of Communications','Wanda','Gree','TCL','Hisense','Nio','XPeng','Pinduoduo','NetEase','Bilibili','Kuaishou','JD Sports CN','361 Degrees','Peak Sport','Mengniu','Wahaha','Nongfu Spring','Moutai','Wuliangye','Sinopec Lubricants','China Life'],
  JP:['Butterfly','Nittaku','Mizuno','Toyota','Sony','Panasonic','Nintendo','Uniqlo','Rakuten','Asics','Honda','SoftBank','Yasaka','TSP','Canon','Bridgestone','Fujitsu','Kirin','Suntory','Nomura','Yamaha','Casio','Shiseido','Nissan',
    'Mitsubishi','Subaru','Mazda','Hitachi','Toshiba','Sharp','Epson','Ricoh','Komatsu','Daikin','Asahi','Sapporo','Ajinomoto','Nissin','Meiji','Lotte JP','Docomo','au KDDI','Seven & i','Fast Retailing','Mikasa','Molten','Descente','Mizuno Pro'],
  SE:['IKEA','Volvo','Spotify','Ericsson','H&M','Electrolux','SEB','Scania','Klarna','Oatly','Stiga','SKF','Tetra Pak','Atlas Copco','Sandvik','ICA','Swedbank','Telia','Husqvarna','Assa Abloy','Securitas','Alfa Laval','Boliden','Fj\u00e4llr\u00e4ven',
    'Volvo Trucks','Handelsbanken','Nordea SE','EQT','Investor AB','Essity','Hexagon','Epiroc','Trelleborg','Getinge','Kinnevik','Telenor SE','Comviq','Systembolaget','Coop SE','\u00c5hl\u00e9ns','Clas Ohlson','Bj\u00f6rn Borg','Craft','Peak Performance','Norr\u00f8na','Absolut','Spendrups','Marabou'],
  KR:['Samsung','LG','Hyundai','Kia','SK Group','Naver','Kakao','Lotte','POSCO','CJ','Hana Bank','Nexen','Hanwha','Doosan','Coupang','KB','Shinhan','Amorepacific','Celltrion','GS','Nexon','Krafton','Hankook','Kolon',
    'SK Hynix','LG Chem','LG Energy','Samsung SDI','Kakao Bank','Toss','Woori Bank','NH Bank','KT','LG U+','Emart','Homeplus','Orion','Nongshim','Ottogi','Binggrae','Hite Jinro','Fila Korea','Descente Korea','Hyundai Mobis','Kumho','HD Hyundai','Naver Webtoon'],
};

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

const EQUIPMENT_BRANDS=[
  {id:'stiga',name:'Stiga',logo:'\ud83d\udd35',bonus:{atk:4},bonusDesc:'+4 ATK',color:'#1a50a0',price:3000,prestige:20},
  {id:'butterfly',name:'Butterfly',logo:'\ud83d\udfe1',bonus:{srv:5},bonusDesc:'+5 SRV',color:'#c09000',price:4500,prestige:30},
  {id:'donic',name:'Donic',logo:'\ud83d\udd34',bonus:{def:4,men:2},bonusDesc:'+4 DEF, +2 MEN',color:'#c02818',price:4000,prestige:25},
  {id:'tibhar',name:'Tibhar',logo:'\ud83d\udfe2',bonus:{atk:3,srv:3},bonusDesc:'+3 ATK, +3 SRV',color:'#207040',price:5500,prestige:35},
  {id:'xiom',name:'Xiom',logo:'\u26ab',bonus:{men:6},bonusDesc:'+6 MEN',color:'#181818',price:3500,prestige:28},
  {id:'cornilleau',name:'Cornilleau',logo:'\ud83d\udfe0',bonus:{def:6},bonusDesc:'+6 DEF',color:'#c84800',price:5000,prestige:32},
];

const TECH_PARTNERSHIPS=[
  {id:'tp_local',name:'SportEquip Polska',tier:1,prestige:[0,22],costPerSeason:-2000,bonus:{fh:1,bh:1,srv:1,ret:1,foot:1,men:1},mktBonus:0.00,bonusDesc:'+1 do wszystkich (podstawowy sprzęt)',desc:'Podstawowy pakiet sprzętowy dostępny dla KAŻDEGO klubu — wszyscy grają uczciwym sprzętem. Lekko odciąża budżet.',icon:'🏓'},
  {id:'tp_regional',name:'Andro Regional Lab',tier:2,prestige:[16,38],costPerSeason:-500,bonus:{fh:1,bh:1,srv:1,ret:1,foot:1,men:1},mktBonus:0.06,bonusDesc:'+1 do wszystkich · +6% marketability',desc:'Ten sam sprzęt bazowy, ale marka zaczyna Cię promować — więcej merchu i frekwencji.',icon:'🧪'},
  {id:'tp_national',name:'Butterfly Performance',tier:3,prestige:[30,58],costPerSeason:1000,bonus:{fh:1,bh:1,srv:1,ret:1,foot:1,men:1},mktBonus:0.12,bonusDesc:'+1 do wszystkich · +12% marketability',desc:'Krajowy kontrakt marketingowy. Sprzęt bez zmian, ale co-branding napędza przychody.',icon:'🦋'},
  {id:'tp_pro',name:'Tibhar Pro Circuit',tier:4,prestige:[48,74],costPerSeason:3000,bonus:{fh:2,bh:1,srv:2,ret:1,foot:1,men:1},mktBonus:0.18,bonusDesc:'+1 do wszystkich, +1 ATK/SRV · +18% marketability',desc:'Pakiet zawodniczy: DROBNY dodatek ofensywny plus mocna promocja marki — za opłatą.',icon:'🚀'},
  {id:'tp_elite',name:'DHS Elite Series',tier:5,prestige:[64,88],costPerSeason:6000,bonus:{fh:2,bh:1,srv:2,ret:1,foot:1,men:1},mktBonus:0.26,bonusDesc:'+1 do wszystkich, +1 ATK/SRV · +26% marketability',desc:'Elitarny partner. Marginalny edge sprzętowy, ale duży strumień marketingowy — za wysoką opłatą.',icon:'💎'},
  {id:'tp_world',name:'Global Xiom Signature',tier:6,prestige:[82,100],costPerSeason:10000,bonus:{fh:2,bh:1,srv:2,ret:1,foot:1,men:1},mktBonus:0.35,bonusDesc:'+1 do wszystkich, +1 ATK/SRV · +35% marketability',desc:'Kontrakt premium dla topu. Przewaga na korcie MINIMALNA i płatna — realna wartość to globalny marketing.',icon:'🌍'},
];

const INFRA_HALL=[
  {level:0,name:'Brak hali',desc:'Treningi na podw\u00f3rku',trainingBonus:0,cost:0,capacity:50},
  {level:1,name:'Sala sportowa',desc:'+10% efektywno\u015bci trenera',trainingBonus:0.10,cost:12000,capacity:150},
  {level:2,name:'Profesjonalna hala',desc:'+25% efektywno\u015bci trenera',trainingBonus:0.25,cost:28000,capacity:300},
  {level:3,name:'Centrum olimpijskie',desc:'+50% efektywno\u015bci trenera',trainingBonus:0.50,cost:60000,capacity:500},
  {level:4,name:'Narodowy kampus TT',desc:'+65% efektywno\u015bci trenera i lepsze przygotowanie meczowe',trainingBonus:0.65,cost:95000,capacity:850},
  {level:5,name:'Hyper Performance Dome',desc:'+80% efektywno\u015bci trenera i topowe warunki przygotowa\u0144',trainingBonus:0.80,cost:145000,capacity:1300},
];

const INFRA_MED=[
  {level:0,name:'Brak centrum med.',desc:'Standardowy czas leczenia',injBonus:0,cost:0},
  {level:1,name:'Gabinet medyczny',desc:'-25% czasu kontuzji',injBonus:0.25,cost:8000},
  {level:2,name:'Centrum rehabilitacji',desc:'-50% czasu kontuzji',injBonus:0.50,cost:20000},
  {level:3,name:'Centrum medycyny sportu',desc:'-50% czasu kontuzji + mniejsze ryzyko nawrotu',injBonus:0.50,cost:45000},
  {level:4,name:'Laboratorium przeci\u0105\u017ce\u0144',desc:'-60% czasu kontuzji i wyra\u017anie mniejsze ryzyko urazu',injBonus:0.60,cost:78000},
  {level:5,name:'Instytut regeneracji',desc:'-70% czasu kontuzji i pe\u0142ne zaplecze odnowy',injBonus:0.70,cost:118000},
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
];

const INFRA_MERCH=[
  {level:0,name:'Brak sklepu',desc:'Brak przychod\u00f3w z merchandisingu',income:0,cost:0},
  {level:1,name:'Stragan kibica',desc:'Skromne gad\u017cety. +3% od marketability klubu',income:0.03,cost:15000},
  {level:2,name:'Sklep Online',desc:'Koszulki i pami\u0105tki. +6% od marketability klubu',income:0.06,cost:32000},
  {level:3,name:'Megasklep',desc:'Pe\u0142na oferta. +10% od marketability klubu',income:0.10,cost:70000},
  {level:4,name:'Platforma lifestyle',desc:'Kolekcje klubowe. +14% od marketability klubu',income:0.14,cost:105000},
  {level:5,name:'Global fan store',desc:'Mi\u0119dzynarodowy sklep premium. +18% od marketability klubu',income:0.18,cost:150000},
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
const constants = { COUNTRIES, COUNTRY_IDS, MUNDIAL_PARTICIPANTS, MUNDIAL_INTERVAL, RECORDS_KEYS, LEAGUE_FORMATS, EQUIPMENT, TRAITS, SK, SL, FN, LN, TNAMES_L1, TNAMES_L2, TNAMES_AMATEUR, CNAMES, SCOUTNAMES, PHYSIONAMES, PSYCHNAMES, SNAMES, COUNTRY_SPONSORS, SGOALS, SFULL, SPONSOR_TIERS, COACH_STYLES, PLAYER_STYLES, PLAYER_STYLE_INFO, EQUIPMENT_BRANDS, TECH_PARTNERSHIPS, INFRA_HALL, INFRA_MED, INFRA_ACADEMY, INFRA_MERCH, PR_DIRECTORS, SCOUT_SPECIALTIES, POLISH_REGIONS, TOTAL_MATCHDAYS, CHART_COLORS, CLUB_IDENTITIES };
window.PPM.constants = constants;
