# 05 — Calques, slots et Z-order

## Pourquoi
Un personnage cut-out crédible dépend autant de l'ordre des calques que du rig.

## Exemple de front view
Arrière → avant :
1. hair_back
2. arm_back
3. leg_back
4. torso/pelvis
5. leg_front
6. arm_front
7. neck/head
8. face
9. hair_front
10. accessoires

## Slots
Chaque partie visible doit être attachée à un slot.
Un slot stocke :
- bone
- part
- zIndex
- visibility
- blend/opacity si nécessaire

## Z-order animé
Lors d'un croisement des bras ou d'une rotation de corps, l'ordre peut changer.
Ce changement doit être un état discret dans la timeline, pas un hack DOM.
