import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

class UserProfile {
    String homeState;
    double avgTransaction;
}

public class CCTransactionGenerator2 {

    static Random rand = new Random();
    static final double TARGET_FRAUD_RATE = 0.09; 

    public static void main(String[] args) {

        int maxTransactions = 10000;
        int cardPoolSize = 1000;
        int transactionId = 1;
        int totalWritten = 0;
        int fraudCount = 0;

        String[] states = {"AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"};

        Map<String, Double> categoryMaxNormals = new HashMap<>();
        categoryMaxNormals.put("retail", 500.0);
        categoryMaxNormals.put("gas", 120.0);
        categoryMaxNormals.put("food", 150.0);
        categoryMaxNormals.put("travel", 1200.0);
        categoryMaxNormals.put("electronics", 1500.0);
        categoryMaxNormals.put("pharmacy", 200.0);
        categoryMaxNormals.put("grocery", 300.0);
        categoryMaxNormals.put("subscription", 50.0);

        String[] devices = {"chip", "swipe", "online", "mobile"};
        Map<String, String> merchantCategory = getMerchantMap();
        List<String> merchants = new ArrayList<>(merchantCategory.keySet());
        List<Long> cardPool = new ArrayList<>();
        Map<Long, UserProfile> profiles = new HashMap<>();

        for (int i = 0; i < cardPoolSize; i++) {
            long card = 4000000000000000L + (long)(rand.nextDouble() * 1000000000000000L);
            cardPool.add(card);
            UserProfile profile = new UserProfile();
            profile.homeState = states[rand.nextInt(states.length)];
            profile.avgTransaction = (new double[]{30.0, 120.0, 400.0})[rand.nextInt(3)];
            profiles.put(card, profile);
        }

        try (FileWriter writer = new FileWriter("transactions3.csv");
             FileWriter fraudWriter = new FileWriter("fraud_log.csv")) {

            writer.append("transaction_id,card_number,timestamp,merchant,category,location,device,amount\n");
            fraudWriter.append("transaction_id,card_number,fraud_type,reason\n");

            String[] fraudTypes = {"TEST_CHARGE", "LOCATION_JUMP", "REPEAT_TX", "OVER_LIMIT", "DRAINER", "MIDNIGHT_SURGE"};

            while (totalWritten < maxTransactions) {
                long card = cardPool.get(rand.nextInt(cardPoolSize));
                UserProfile profile = profiles.get(card);
                LocalDateTime baseTime = LocalDateTime.now().minusMinutes(rand.nextInt(60 * 24 * 30));
                
                String merchant = merchants.get(rand.nextInt(merchants.size()));
                String category = merchantCategory.get(merchant);
                String device = devices[rand.nextInt(devices.length)];
                String location = profile.homeState;

                double currentFraudRate = (totalWritten == 0) ? 0 : (double) fraudCount / totalWritten;
                boolean triggerFraud = (currentFraudRate < TARGET_FRAUD_RATE) && (rand.nextDouble() < 0.12);

                if (triggerFraud) {
                    String type = fraudTypes[rand.nextInt(fraudTypes.length)];

                    switch (type) {
                        case "TEST_CHARGE":
                            // VARIATION: 1 to 3 probing charges
                            int probingCount = 1 + rand.nextInt(3);
                            List<Integer> probingIds = new ArrayList<>();
                            for (int i = 0; i < probingCount; i++) {
                                double small = round(1.0 + rand.nextDouble() * 4.0);
                                write(writer, transactionId++, card, baseTime.plusSeconds(i * 12), merchant, category, location, "online", small);
                                probingIds.add(transactionId - 1);
                                fraudWriter.append((transactionId - 1) + "," + card + ",test_charge,Probing charge " + (i+1) + " of " + probingCount + "\n");
                                totalWritten++; fraudCount++;
                            }
                            double bigHit = round(400.0 + rand.nextDouble() * 1200.0);
                            write(writer, transactionId++, card, baseTime.plusSeconds(60), "Apple", "electronics", location, "online", bigHit);
                            fraudWriter.append((transactionId - 1) + "," + card + ",test_charge,Main hit after probing IDs: " + probingIds + "\n");
                            totalWritten++; fraudCount++;
                            break;

                        case "DRAINER":
                            // VARIATION: 3 to 8 rapid charges (Velocity Attack)
                            int burstSize = 3 + rand.nextInt(6);
                            for (int i = 0; i < burstSize; i++) {
                                double drainAmt = round(150.0 + rand.nextDouble() * 150.0);
                                write(writer, transactionId++, card, baseTime.plusSeconds(i * 10), "Amazon", "retail", location, "online", drainAmt);
                                fraudWriter.append((transactionId - 1) + "," + card + ",drainer,Burst charge " + (i+1) + " of " + burstSize + " (Velocity)\n");
                                totalWritten++; fraudCount++;
                            }
                            break;

                        case "MIDNIGHT_SURGE":
                            // VARIATION: Sometimes it's 1 big item, sometimes 2-3 smaller ones at night
                            int nightTxs = 1 + rand.nextInt(3);
                            LocalDateTime nightTime = baseTime.with(LocalTime.of(1 + rand.nextInt(3), rand.nextInt(59)));
                            for (int i = 0; i < nightTxs; i++) {
                                double nightAmt = round(300.0 + rand.nextDouble() * 600.0);
                                write(writer, transactionId++, card, nightTime.plusMinutes(i * 2), "IntlWireTransfer", "high_risk", location, "online", nightAmt);
                                fraudWriter.append((transactionId - 1) + "," + card + ",midnight_surge,Anomalous night activity at " + nightTime.getHour() + " AM (Tx " + (i+1) + ")\n");
                                totalWritten++; fraudCount++;
                            }
                            break;

                        case "LOCATION_JUMP":
                            int anchorId = transactionId;
                            write(writer, transactionId++, card, baseTime, merchant, category, location, device, round(15 + rand.nextDouble()*40));
                            totalWritten++;
                            String farState;
                            do { farState = states[rand.nextInt(states.length)]; } while (farState.equals(location));
                            write(writer, transactionId++, card, baseTime.plusMinutes(2 + rand.nextInt(10)), "CryptoExchange", "high_risk", farState, "online", round(300 + rand.nextDouble()*500));
                            fraudWriter.append((transactionId - 1) + "," + card + ",location_jump,Jump to " + farState + " shortly after ID:" + anchorId + "\n");
                            totalWritten++; fraudCount++;
                            break;

                        case "REPEAT_TX":
                            double repeatAmt = round(30.0 + rand.nextDouble() * 70.0);
                            int repeats = 2 + rand.nextInt(3); // 2 to 4 repeats
                            for (int i = 0; i < repeats; i++) {
                                write(writer, transactionId++, card, baseTime.plusSeconds(i * 4), merchant, category, location, device, repeatAmt);
                                fraudWriter.append((transactionId - 1) + "," + card + ",repeat_tx,Duplicate amount " + repeatAmt + " (Repeat " + (i+1) + ")\n");
                                totalWritten++; fraudCount++;
                            }
                            break;

                        case "OVER_LIMIT":
                            double limit = categoryMaxNormals.getOrDefault(category, 500.0);
                            double fraudAmt = round(limit * (1.5 + rand.nextDouble() * 2)); 
                            write(writer, transactionId++, card, baseTime, merchant, category, location, device, fraudAmt);
                            fraudWriter.append((transactionId - 1) + "," + card + ",over_limit,Charge " + fraudAmt + " significantly exceeds " + category + " limit\n");
                            totalWritten++; fraudCount++;
                            break;
                    }
                } else {
                    // NORMAL
                    double maxNormal = categoryMaxNormals.getOrDefault(category, 300.0);
                    double amount = profile.avgTransaction * (0.3 + rand.nextDouble());
                    if (amount >= maxNormal) amount = maxNormal * 0.65; 
                    write(writer, transactionId++, card, baseTime, merchant, category, location, device, round(amount));
                    totalWritten++;
                }
            }
            System.out.println("Generation Finished.");
            System.out.println("Final Fraud Rate: " + String.format("%.2f", ((double)fraudCount/totalWritten)*100) + "%");
        } catch (IOException e) { e.printStackTrace(); }
    }

    private static Map<String, String> getMerchantMap() {
        Map<String, String> m = new HashMap<>();
        m.put("Walmart", "retail"); m.put("Amazon", "retail"); m.put("Target", "retail");
        m.put("Shell", "gas"); m.put("Exxon", "gas"); m.put("McDonalds", "food");
        m.put("Starbucks", "food"); m.put("Uber", "travel"); m.put("Delta", "travel");
        m.put("BestBuy", "electronics"); m.put("Apple", "electronics"); m.put("CVS", "pharmacy");
        m.put("Kroger", "grocery"); m.put("Nike", "clothing"); m.put("Netflix", "subscription");
        return m;
    }

    private static double round(double val) { return Math.round(val * 100.0) / 100.0; }

    static void write(FileWriter writer, int id, long card, LocalDateTime time, String merchant, String category, String location, String device, double amount) throws IOException {
        writer.append(id + "," + card + "," + time.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + "," + merchant + "," + category + "," + location + "," + device + "," + String.format("%.2f", amount) + "\n");
    }
}