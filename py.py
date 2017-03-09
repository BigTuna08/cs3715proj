import re
str="apple banana apple 5367"
print re.sub(r'apple|banana', "REDACTED", str)
print(str)
