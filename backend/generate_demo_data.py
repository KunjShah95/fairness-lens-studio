import csv
import random
import os

random.seed(42)

output_file = os.path.join(os.path.dirname(__file__), "demo-healthcare-5000.csv")

genders = [0, 1]  # 0: Female, 1: Male
races = [0, 1, 2, 3]  # 0: White, 1: Black, 2: Asian, 3: Hispanic


def generate_age():
    return random.randint(18, 90)


def get_age_group(age):
    if age < 35:
        return 1  # Young
    elif age < 55:
        return 2  # Middle
    elif age < 70:
        return 3  # Senior
    else:
        return 4  # Elderly


def generate_severity(age, race):
    base = random.randint(1, 10)
    # Subtle bias: older patients and minority patients get slightly lower severity
    age_bias = -0.5 if age > 60 else 0
    race_bias = -0.3 if race in [1, 2, 3] else 0
    return max(1, min(10, base + int(age_bias + race_bias)))


def generate_comorbidity(age):
    base = age // 20 + random.randint(0, 2)
    return min(10, base)


def generate_prior_visits(age):
    return random.randint(0, max(20, age // 3))


def get_insurance_tier(race, age):
    # Bias: minority groups slightly more likely to have lower tier
    base = random.randint(1, 3)
    if race in [1, 3] and random.random() < 0.2:
        base = max(1, base - 1)
    return base


def get_postal_risk(race):
    # Strong correlation with race (proxy)
    if race == 0:
        return random.randint(1, 3)
    elif race == 1:
        return random.randint(3, 5)
    elif race == 2:
        return random.randint(2, 4)
    else:
        return random.randint(3, 5)


def generate_triage_priority(severity, comorbidity, insurance_tier, postal_risk, age):
    # Base score from medical factors - normalize to 0-1 range
    base_score = severity / 10 * 0.4 + comorbidity / 10 * 0.3 + age / 100 * 0.2

    # Insurance bias (higher tier = better care) - subtle
    insurance_bias = (insurance_tier - 2) * 0.05

    # Geographic bias (proxy for race) - subtle
    postal_bias = (postal_risk - 3) * 0.04

    # Final score with noise
    final_score = (
        base_score + insurance_bias - postal_bias + random.uniform(-0.15, 0.15)
    )

    # Threshold for classification
    return 1 if final_score > 0.4 else 0


# Generate 5000 records
rows = []
for i in range(5000):
    gender = random.choice(genders)
    race = random.choice(races)
    age = generate_age()
    age_group = get_age_group(age)
    severity = generate_severity(age, race)
    comorbidity = generate_comorbidity(age)
    prior_visits = generate_prior_visits(age)
    insurance = get_insurance_tier(race, age)
    postal = get_postal_risk(race)
    triage = generate_triage_priority(severity, comorbidity, insurance, postal, age)

    rows.append(
        [
            gender,
            race,
            age,
            age_group,
            severity,
            comorbidity,
            prior_visits,
            insurance,
            postal,
            triage,
        ]
    )

# Write CSV
headers = [
    "gender",
    "race",
    "age",
    "age_group",
    "symptom_severity",
    "comorbidity_index",
    "prior_visit_count",
    "insurance_tier",
    "postal_code_risk",
    "triage_priority",
]

with open(output_file, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

print(f"Generated {len(rows)} records in {output_file}")
print(f"Columns: {len(headers)}")
print(f"Positive cases (triage_priority=1): {sum(1 for r in rows if r[9] == 1)}")
print(f"Positive rate: {sum(1 for r in rows if r[9] == 1) / len(rows):.2%}")
