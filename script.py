import easyocr
import re
import datetime

# Charger le modèle pour la langue française
reader = easyocr.Reader(['fr']) 

# Lire le texte de l'image
result = reader.readtext('capture.jpg')
texte_extrait = [item[1] for item in result]

# Les jours de la semaine dans l'ordre
pattern_vacances = r'(r(\.)?h)|((r|p)cdj)'

# Initialisation de variables
jours = []  # Pour stocker les jours de la semaine
actions = []  # Pour stocker les actions de Rescan Morgane

# Variables de contrôle
start_index_rescan = -1
rescan_actions = []  # Pour stocker les actions spécifiques à Rescan Morgane
date_found = False  # Flag pour s'assurer qu'on ne collecte plus de dates après la première

def is_consecutive(date1, date2):
    """Vérifie si date2 est consécutive à date1"""
    delta = date2 - date1
    return delta.days == 1

def extraire_dates_consecutives(f):
    dates = []
    last_date = None

    for i, ligne in enumerate(f):
        try:
            # On essaie de convertir la ligne en une date (format: JJ/MM)
            date = datetime.datetime.strptime(ligne.strip(), "%d/%m")
            # Si c'est la première date, on l'ajoute directement
            if last_date is None:
                dates.append(date)
                last_date = date
            # Si la date est consécutive à la précédente, on l'ajoute aussi
            elif is_consecutive(last_date, date):
                dates.append(date)
                last_date = date
            else:
                last_date = None  # Réinitialiser si on rencontre une date non consécutive
        except ValueError:
            # Si la ligne ne correspond pas à une date valide, on l'ignore
            pass

    return dates

dates_consecutives = extraire_dates_consecutives(texte_extrait)

# Parcours de toutes les lignes du fichier
for i, line in enumerate(texte_extrait):

    # Recherche des jours au format LUN, MAR, etc.
    jour_match = re.findall(r'(LUN|MAR|MER|JEU|VEN|SAM|DIM)', line, re.IGNORECASE)
    if jour_match:
        jours.extend(jour_match)

    # Recherche de "Rescan Morgane" et démarrage de la collecte des actions
    if "Rescan Morgane" in line:
        start_index_rescan = i + 2  # Commence après "Rescan Morgane"
        break
    # Collecte des actions de Rescan Morgane jusqu'à ce qu'on ait collecté assez d'actions
    # Si "Rescan Morgane" a été trouvé
	
    if start_index_rescan != -1:
	    # Rechercher "Inf.s.gene" après "Rescan Morgane"
	    for i in range(start_index_rescan, len(lines)):
	        if "Inf.s.gene" in lines[i]:
	            start_index_rescan = i + 1  # Commence après "Inf.s.gene"
	            break

actions = [ligne.strip() for ligne in texte_extrait[start_index_rescan:start_index_rescan + len(jours)]]
resultats = ["Morgane ne travaille pas" if re.match(pattern_vacances, action, re.IGNORECASE) else "Morgane travaille" for action in actions]

# Vérifier qu'on a le même nombre de dates, jours et actions
if len(dates_consecutives) == len(jours) == len(resultats):
    # Affichage des résultats sous forme de tableau
    for i in range(len(dates_consecutives)):
        print(f"{dates_consecutives[i].strftime('%d/%m')} ({jours[i]}): {resultats[i]}")
else:
    print("Erreur: le nombre de dates, jours et actions ne correspond pas.")