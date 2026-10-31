"""Offline SQL three-valued predicate equivalence model; no database access."""
from itertools import product
def sql_and(a,b):
    return False if a is False or b is False else None if a is None or b is None else True
def sql_not(a):
    return None if a is None else not a
def prefix(k,p):
    return None if k is None else k.startswith(p)
def eq(a,b):
    return a is not None and b is not None and a==b
keys=[None,"n:a:x","moi:n:a:x","moi:a:n:x","moi:moi:a:n:x","other",""]
values=list(product([None,1,2],repeat=7))
checks=0
for key, canonical_key in product(keys,repeat=2):
    for fields in values:
        canonical=tuple(None if v==1 else v for v in fields)
        p1=prefix(key,"moi:")
        p2=prefix(key,"moi:a:n:")
        alias1=None if key is None else key[4:]
        alias2=None if key is None else key.replace("moi:a:n:","n:a:")
        e1=eq(canonical_key,alias1)
        e2=eq(canonical_key,alias2) and canonical==fields
        old=sql_and(sql_not(sql_and(p1,e1)),sql_not(sql_and(p2,e2)))
        new=not (p1 is True and e1) and not (p2 is True and e2)
        assert (old is True)==new,(key,canonical_key,fields)
        checks+=1
print(f"{checks} predicate membership cases passed; SQL engine/live dataset equivalence not established")
