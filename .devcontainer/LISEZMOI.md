# Palette, version de test

Cette fenêtre est un ordinateur temporaire fourni par GitHub. Palette s'y installe et démarre toute seule : **vous n'avez rien à taper**.

## 1. Patienter

La première installation prend **5 à 8 minutes**. Pendant ce temps, le terminal en bas de l'écran affiche seulement « Running postCreateCommand… » avec une petite roue : c'est normal, ne fermez rien et ne rechargez pas la page.

Ensuite, un second terminal affiche les étapes du démarrage (lignes `[Palette]`).

## 2. Ouvrir l'application

Quand le terminal affiche **« Palette démarre »** puis **« ✓ Ready »**, Palette est prête. Pour l'ouvrir, au choix :

- cliquez sur **Open in Browser** dans la notification qui apparaît en bas à droite ;
- ou, dans le panneau du bas, onglet **PORTS**, ligne **Palette (3000)** : passez la souris sur l'adresse de la colonne **Forwarded Address** et cliquez sur l'icône en forme de globe.

N'utilisez pas l'icône voisine « Preview in Editor » : Palette ne fonctionne pas dans l'éditeur. Avant « Palette démarre », l'adresse affiche une page d'erreur : attendez simplement. Les messages en jaune ou en anglais du terminal (par exemple `⚠ "next start" does not work with "output: standalone"`) sont sans conséquence.

## 3. Se connecter

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Super user TGE | `admin@thegoodexperience.com` | `Palette2026` |
| Menuisier (Atelier Bois & Co) | `julien@boisandco.fr` ou `06 12 34 56 01` | `Atelier2026` |
| Menuisier (Menuiserie Lefèvre) | `claire@lefevre-menuiserie.fr` | `Atelier2026` |

Les données sont fictives : vous pouvez tout modifier ou supprimer.

## 4. Tester sur un téléphone

Onglet **PORTS**, ligne **Palette (3000)** : passez la souris sur l'adresse et cliquez sur l'icône de copie. L'adresse ressemble à `https://nom-au-hasard-3000.app.github.dev/` et reste la même tant que vous gardez ce codespace. Envoyez-la sur le téléphone (e-mail, Notes…) et ouvrez-la **dans Safari ou Chrome** : si elle s'ouvre dans Mail ou WhatsApp, choisissez « Ouvrir dans Safari ».

GitHub demande alors de se connecter avec **le même compte GitHub**. Cette connexion dure 3 heures : ensuite, rechargez la page et reconnectez-vous. Sur cette version de test, n'ajoutez pas Palette à l'écran d'accueil du téléphone.

Pour faire tester quelqu'un d'autre (un menuisier) sans connexion GitHub : onglet **PORTS**, clic droit sur la ligne **Palette (3000)** (sur Mac : clic à deux doigts), **Port Visibility**, **Public**. Toute personne qui a l'adresse peut alors ouvrir Palette avec les mots de passe de démonstration, qui sont publics : ne transmettez que le compte menuisier, et repassez en **Private** après le test. Après chaque mise en veille, l'adresse redevient **Private** : refaites la manipulation avant un nouveau test.

## Bon à savoir

- **Mise en veille** : après 30 minutes sans activité, l'ordinateur temporaire s'arrête et Palette ne répond plus, même sur le téléphone. Les pages consultées dans Palette comptent comme de l'activité, mais seulement pendant que le codespace tourne. Pour un long test, allongez ce délai jusqu'à 4 heures **avant** de créer le codespace : [github.com/settings/codespaces](https://github.com/settings/codespaces), rubrique « Default idle timeout ». Dans tous les cas, il s'arrête au bout de 12 heures.
- **Revenir plus tard** : cliquez de nouveau sur le bouton « Open in GitHub Codespaces » du README, puis sur **Resume this codespace** (surtout pas **Create a new one**, qui repartirait de zéro avec une autre adresse). Ou bien, sur [github.com/codespaces](https://github.com/codespaces), cliquez sur le nom du codespace (un nom tiré au hasard, sous « arthurlederer/palette »). Palette redémarre seule en une à deux minutes.
- **Mises à jour** : à chaque démarrage, la dernière version publiée de Palette est récupérée et installée automatiquement (quelques minutes de plus ce jour-là).
- **Laissez le terminal Palette ouvert** : le fermer (icône corbeille) arrête l'application. Pour la relancer, rechargez la page du codespace.
- **Vos données** (comptes, éléments, photos) sont conservées tant que ce codespace existe. GitHub le supprime automatiquement après 30 jours sans ouverture.
- **Coût** : un compte GitHub gratuit inclut chaque mois 60 heures d'utilisation de cet ordinateur temporaire et 15 Go de stockage. Sans carte bancaire enregistrée, rien n'est facturé : une fois le quota épuisé, GitHub bloque l'ouverture jusqu'au mois suivant. Le stockage est décompté tant que le codespace existe, même arrêté : n'en gardez qu'un, et supprimez-le quand vous avez fini depuis [github.com/codespaces](https://github.com/codespaces) (menu **…**, **Delete**).
